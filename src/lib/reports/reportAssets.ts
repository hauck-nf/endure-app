import fs from "fs/promises";
import path from "path";

export type ReportAssets = {
  logo: Uint8Array;
  logoLight: Uint8Array;
  footerMark: Uint8Array;

  coverMountains: Uint8Array;
  coverRunner: Uint8Array;

  mountainsStrip: Uint8Array;
  pageRunner: Uint8Array;
  cornerLines: Uint8Array;

  user: Uint8Array;
  calendar: Uint8Array;
  clock: Uint8Array;
  shield: Uint8Array;
  target: Uint8Array;
  brain: Uint8Array;
  chart: Uint8Array;
  star: Uint8Array;
  shoe: Uint8Array;
  clipboard: Uint8Array;
};

async function readAsset(...parts: string[]) {
  const fullPath = path.join(process.cwd(), "public", "report-assets", ...parts);
  return new Uint8Array(await fs.readFile(fullPath));
}

export async function loadReportAssets(): Promise<ReportAssets> {
  return {
    logo: await readAsset("brand", "logo-endure.png"),
    logoLight: await readAsset("brand", "logo-endure-light.png"),
    footerMark: await readAsset("brand", "footer-mark.png"),

    coverMountains: await readAsset("cover", "cover-mountains.png"),
    coverRunner: await readAsset("cover", "cover-runner.png"),

    mountainsStrip: await readAsset("decor", "mountains-strip.png"),
    pageRunner: await readAsset("decor", "page-runner.png"),
    cornerLines: await readAsset("decor", "corner-lines.png"),

    user: await readAsset("icons", "user.png"),
    calendar: await readAsset("icons", "calendar.png"),
    clock: await readAsset("icons", "clock.png"),
    shield: await readAsset("icons", "shield.png"),
    target: await readAsset("icons", "target.png"),
    brain: await readAsset("icons", "brain.png"),
    chart: await readAsset("icons", "chart.png"),
    star: await readAsset("icons", "star.png"),
    shoe: await readAsset("icons", "shoe.png"),
    clipboard: await readAsset("icons", "clipboard.png"),
  };
}
