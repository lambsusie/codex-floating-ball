const { app, nativeImage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function createPng(sourcePath, size) {
  const image = nativeImage.createFromPath(sourcePath);
  if (image.isEmpty()) throw new Error(`Could not load icon source: ${sourcePath}`);
  return image.resize({ width: size, height: size, quality: "best" }).toPNG();
}

function createIco(pngEntries) {
  const headerSize = 6 + pngEntries.length * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngEntries.length, 4);

  pngEntries.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });

  return Buffer.concat([header, ...pngEntries.map(({ png }) => png)]);
}

app.whenReady().then(() => {
  const assets = path.join(__dirname, "../assets");
  const iconSource = path.join(assets, "icon.svg");
  const templateSource = path.join(assets, "trayTemplate.svg");
  const icoEntries = [16, 20, 24, 32, 40, 48, 64, 128, 256]
    .map((size) => ({ size, png: createPng(iconSource, size) }));

  fs.writeFileSync(path.join(assets, "icon.ico"), createIco(icoEntries));
  fs.writeFileSync(path.join(assets, "tray-icon.png"), createPng(iconSource, 64));
  fs.writeFileSync(path.join(assets, "trayTemplate.png"), createPng(templateSource, 16));
  fs.writeFileSync(path.join(assets, "trayTemplate@2x.png"), createPng(templateSource, 32));
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
