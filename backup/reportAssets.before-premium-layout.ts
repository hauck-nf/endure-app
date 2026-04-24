import fs from "fs/promises";
import path from "path";
import { PDFDocument } from "pdf-lib";

export async function loadReportAssets(pdf: PDFDocument) {
  const base = path.join(process.cwd(), "public", "report-assets");

  const load = async (p: string) =>
    fs.readFile(path.join(base, p));

  const [
    logo,
    logoLight,
    runnerPage,
    runnerCover,
    mountains,
    star,
    brain,
    user,
    calendar,
    clock,
    shield,
    target,
    chart,
    shoe,
    clipboard,
  ] = await Promise.all([
    load("brand/logo-endure.png"),
    load("brand/logo-endure-light.png"),
    load("decor/page-runner.png"),
    load("cover/cover-runner.png"),
    load("cover/cover-mountains.png"),
    load("icons/star.png"),
    load("icons/brain.png"),
    load("icons/user.png"),
    load("icons/calendar.png"),
    load("icons/clock.png"),
    load("icons/shield.png"),
    load("icons/target.png"),
    load("icons/chart.png"),
    load("icons/shoe.png"),
    load("icons/clipboard.png"),
  ]);

  return {
    logo: await pdf.embedPng(logo),
    logoLight: await pdf.embedPng(logoLight),
    runnerPage: await pdf.embedPng(runnerPage),
    runnerCover: await pdf.embedPng(runnerCover),
    mountains: await pdf.embedPng(mountains),
    star: await pdf.embedPng(star),
    brain: await pdf.embedPng(brain),
    user: await pdf.embedPng(user),
    calendar: await pdf.embedPng(calendar),
    clock: await pdf.embedPng(clock),
    shield: await pdf.embedPng(shield),
    target: await pdf.embedPng(target),
    chart: await pdf.embedPng(chart),
    shoe: await pdf.embedPng(shoe),
    clipboard: await pdf.embedPng(clipboard),
  };
}