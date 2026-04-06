use std::path::Path;

fn main() {
	napi_build::setup();

	let scanner_dir = Path::new("vendor/tree-sitter-glimmer");
	let scanner_path = scanner_dir.join("scanner.c");
	let parser_header_path = scanner_dir.join("parser.h");

	println!("cargo:rerun-if-changed={}", scanner_path.display());
	println!("cargo:rerun-if-changed={}", parser_header_path.display());

	let mut build = cc::Build::new();
	build
		.std("c11")
		.include(scanner_dir)
		.file(&scanner_path)
		// Vendored code: suppress warnings (including the ar -D probe noise on
		// macOS where Apple's ar rejects the deterministic flag).
		.cargo_warnings(false);

	#[cfg(target_env = "msvc")]
	build.flag("-utf-8");

	build.compile("tree-sitter-glimmer-scanner");
}
