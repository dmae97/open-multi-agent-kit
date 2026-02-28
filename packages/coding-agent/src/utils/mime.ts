import * as fs from "node:fs/promises";

const FILE_TYPE_SNIFF_BYTES = 12;

function detectMimeFromBytes(buf: Buffer, bytesRead: number): string | null {
	if (bytesRead >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
		return "image/jpeg";
	}
	if (
		bytesRead >= 8 &&
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47 &&
		buf[4] === 0x0d &&
		buf[5] === 0x0a &&
		buf[6] === 0x1a &&
		buf[7] === 0x0a
	) {
		return "image/png";
	}
	if (bytesRead >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
		return "image/gif";
	}
	if (
		bytesRead >= 12 &&
		buf[0] === 0x52 &&
		buf[1] === 0x49 &&
		buf[2] === 0x46 &&
		buf[3] === 0x46 &&
		buf[8] === 0x57 &&
		buf[9] === 0x45 &&
		buf[10] === 0x42 &&
		buf[11] === 0x50
	) {
		return "image/webp";
	}
	return null;
}

export async function detectSupportedImageMimeTypeFromFile(filePath: string): Promise<string | null> {
	const fileHandle = await fs.open(filePath, "r");
	try {
		const buffer = Buffer.allocUnsafe(FILE_TYPE_SNIFF_BYTES);
		const { bytesRead } = await fileHandle.read(buffer, 0, FILE_TYPE_SNIFF_BYTES, 0);
		if (bytesRead === 0) {
			return null;
		}
		return detectMimeFromBytes(buffer, bytesRead);
	} finally {
		await fileHandle.close();
	}
}
