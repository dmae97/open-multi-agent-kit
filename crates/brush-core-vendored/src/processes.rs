//! Process management

use futures::FutureExt;
use tokio_util::sync::CancellationToken;

#[cfg(windows)]
use std::os::windows::io::{AsRawHandle, OwnedHandle, RawHandle};

use crate::{error, sys};

/// A waitable future that will yield the results of a child process's execution.
pub(crate) type WaitableChildProcess = std::pin::Pin<
    Box<dyn futures::Future<Output = Result<std::process::Output, std::io::Error>> + Send + Sync>,
>;

/// Tracks a child process being awaited.
pub struct ChildProcess {
    /// If available, the process ID of the child.
    pid: Option<sys::process::ProcessId>,
    /// A waitable future that will yield the results of a child process's execution.
    exec_future: WaitableChildProcess,
    #[cfg(windows)]
    /// Windows handle duplicated from the child process for safe termination.
    kill_handle: Option<OwnedHandle>,
}

impl ChildProcess {
    /// Wraps a child process and its future.
    pub fn new(pid: Option<sys::process::ProcessId>, child: sys::process::Child) -> Self {
        #[cfg(windows)]
        let kill_handle = duplicate_handle(child.as_raw_handle());

        Self {
            pid,
            exec_future: Box::pin(child.wait_with_output()),
            #[cfg(windows)]
            kill_handle,
        }
    }

    /// Returns the process's ID.
    pub const fn pid(&self) -> Option<sys::process::ProcessId> {
        self.pid
    }

    /// Duplicates the process handle for termination use on Windows.
    #[cfg(windows)]
    pub fn duplicate_kill_handle(&self) -> Option<OwnedHandle> {
        let handle = self.kill_handle.as_ref()?;
        duplicate_handle(handle.as_raw_handle())
    }

    /// Waits for the process to exit.
    ///
    /// If a cancellation token is provided and triggered, the process will be killed.
    pub async fn wait(
        &mut self,
        cancel_token: Option<CancellationToken>,
    ) -> Result<ProcessWaitResult, error::Error> {
        #[allow(unused_mut, reason = "only mutated on some platforms")]
        let mut sigtstp = sys::signal::tstp_signal_listener()?;
        #[allow(unused_mut, reason = "only mutated on some platforms")]
        let mut sigchld = sys::signal::chld_signal_listener()?;

        let cancelled = async {
            match &cancel_token {
                Some(token) => token.cancelled().await,
                None => std::future::pending().await,
            }
        };
        tokio::pin!(cancelled);

        #[allow(clippy::ignored_unit_patterns)]
        loop {
            tokio::select! {
                output = &mut self.exec_future => {
                    break Ok(ProcessWaitResult::Completed(output?))
                },
                _ = &mut cancelled => {
                    self.kill();
                    break Ok(ProcessWaitResult::Cancelled)
                },
                _ = sigtstp.recv() => {
                    break Ok(ProcessWaitResult::Stopped)
                },
                _ = sigchld.recv() => {
                    if sys::signal::poll_for_stopped_children()? {
                        break Ok(ProcessWaitResult::Stopped);
                    }
                },
                _ = sys::signal::await_ctrl_c() => {
                    // SIGINT got thrown. Handle it and continue looping. The child should
                    // have received it as well, and either handled it or ended up getting
                    // terminated (in which case we'll see the child exit).
                },
            }
        }
    }

    /// Terminates the process if we have a PID.
    fn kill(&self) {
        let Some(pid) = self.pid else { return };

        #[cfg(unix)]
        {
            let _ = nix::sys::signal::kill(nix::unistd::Pid::from_raw(pid), nix::sys::signal::Signal::SIGKILL);
        }

        #[cfg(windows)]
        {
            use windows_sys::Win32::Foundation::CloseHandle;
            use windows_sys::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};

            // SAFETY: Windows API calls with proper handle management
            unsafe {
                #[expect(clippy::cast_sign_loss)]
                let handle = OpenProcess(PROCESS_TERMINATE, 0, pid as u32);
                if !handle.is_null() {
                    let _ = TerminateProcess(handle, 1);
                    CloseHandle(handle);
                }
            }
        }
    }

    pub(crate) fn poll(&mut self) -> Option<Result<std::process::Output, error::Error>> {
        let checkable_future = &mut self.exec_future;
        checkable_future
            .now_or_never()
            .map(|result| result.map_err(Into::into))
    }
}

#[cfg(windows)]
fn duplicate_handle(handle: RawHandle) -> Option<OwnedHandle> {
    use std::os::windows::io::FromRawHandle;
    use windows_sys::Win32::System::Threading::{
        DuplicateHandle, GetCurrentProcess, DUPLICATE_SAME_ACCESS,
    };

    let current = unsafe { GetCurrentProcess() };
    let mut out_handle = std::ptr::null_mut();
    let ok = unsafe {
        DuplicateHandle(
            current,
            handle as _,
            current,
            &mut out_handle,
            0,
            0,
            DUPLICATE_SAME_ACCESS,
        )
    };
    if ok == 0 || out_handle.is_null() {
        return None;
    }

    Some(unsafe { OwnedHandle::from_raw_handle(out_handle) })
}

/// Represents the result of waiting for an executing process.
pub enum ProcessWaitResult {
    /// The process completed.
    Completed(std::process::Output),
    /// The process stopped and has not yet completed.
    Stopped,
    /// The process was killed due to cancellation.
    Cancelled,
}
