export function selectCopyText(field: HTMLTextAreaElement) {
  field.focus({ preventScroll: true });
  field.select();
  // Explicit range selection also covers mobile browsers with partial select() support.
  field.setSelectionRange(0, field.value.length);
}

export async function copyText(value: string, field: HTMLTextAreaElement): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Clipboard access can be denied by browser permissions or an embedded browser.
  }

  try {
    selectCopyText(field);
    // Compatibility path for browsers without usable Clipboard API access.
    return document.execCommand('copy');
  } catch {
    return false;
  }
}
