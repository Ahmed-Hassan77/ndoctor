import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const A4_WIDTH_PX = "794px";
const CAPTURE_FONT = "Almarai, 'Segoe UI', Tahoma, sans-serif";

/**
 * html2canvas cannot parse Tailwind v4 oklch() colors from stylesheets.
 * Strip stylesheets in the clone so only inline hex/rgb styles are used.
 * @param {Document} clonedDoc
 */
function stripUnsupportedStylesheets(clonedDoc) {
  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    node.remove();
  });
}

/**
 * Prepare the cloned report root for capture.
 * @param {HTMLElement} clonedElement
 */
function prepareClonedElement(clonedElement) {
  clonedElement.style.position = "static";
  clonedElement.style.left = "auto";
  clonedElement.style.top = "auto";
  clonedElement.style.opacity = "1";
  clonedElement.style.zIndex = "auto";
  clonedElement.style.width = A4_WIDTH_PX;
  clonedElement.style.visibility = "visible";
  clonedElement.style.pointerEvents = "none";
  clonedElement.style.backgroundColor = "#ffffff";
  clonedElement.style.fontFamily = CAPTURE_FONT;
}

/**
 * Capture a DOM element as a multi-page A4 PDF (supports Arabic via loaded web fonts).
 * @param {HTMLElement} element
 * @param {string} filename
 */
export async function exportElementToPdf(element, filename) {
  if (!element) {
    throw new Error("Missing report element");
  }

  const previous = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    opacity: element.style.opacity,
    pointerEvents: element.style.pointerEvents,
    zIndex: element.style.zIndex,
    width: element.style.width,
    visibility: element.style.visibility,
    backgroundColor: element.style.backgroundColor,
    fontFamily: element.style.fontFamily,
  };

  element.style.position = "fixed";
  element.style.left = "0";
  element.style.top = "0";
  element.style.opacity = "0.01";
  element.style.pointerEvents = "none";
  element.style.zIndex = "9999";
  element.style.width = A4_WIDTH_PX;
  element.style.visibility = "visible";
  element.style.backgroundColor = "#ffffff";
  element.style.fontFamily = CAPTURE_FONT;

  try {
    await document.fonts.ready;

    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    if (element.scrollWidth === 0 || element.scrollHeight === 0) {
      throw new Error("Report element has no dimensions");
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      allowTaint: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc, clonedElement) => {
        stripUnsupportedStylesheets(clonedDoc);
        prepareClonedElement(clonedElement);
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("PDF capture produced an empty canvas");
    }

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("[exportElementToPdf] Failed to generate PDF:", error);
    throw new Error("Could not generate PDF. Please try again.");
  } finally {
    element.style.position = previous.position;
    element.style.left = previous.left;
    element.style.top = previous.top;
    element.style.opacity = previous.opacity;
    element.style.pointerEvents = previous.pointerEvents;
    element.style.zIndex = previous.zIndex;
    element.style.width = previous.width;
    element.style.visibility = previous.visibility;
    element.style.backgroundColor = previous.backgroundColor;
    element.style.fontFamily = previous.fontFamily;
  }
}
