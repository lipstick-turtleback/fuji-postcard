/* The shape every browser test shares: collect checks, print them, fail loudly.

   Each harness owns one question and one Chrome — the page as everybody sees
   it, the page asked to hold still, the page nobody has touched. They report
   the same way so the suite reads as one list. */
export function checks(label) {
  const results = [];
  return {
    ok: (name, pass, detail = '') => results.push({ name, pass, detail }),
    finish: () => {
      const failed = results.filter((r) => !r.pass);
      for (const r of results)
        console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
      if (failed.length) {
        console.error(`${label}: ${failed.length} of ${results.length} checks failed`);
        process.exit(1);
      }
      console.log(`${label}: ${results.length} checks — no problems`);
    },
  };
}

/** A machine without Chrome is not a machine with a broken page. */
export const skipped = (label) => {
  console.log(`${label}: no Chrome, or Chrome did not come up - skipped`);
  process.exit(0);
};
