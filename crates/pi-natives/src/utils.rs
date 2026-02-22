/// Saturating cast from `u64` to `u32`, clamping at [`u32::MAX`].
pub fn clamp_u32(value: u64) -> u32 {
	value.min(u32::MAX as u64) as u32
}
