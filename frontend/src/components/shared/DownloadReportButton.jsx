import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { downloadReportById } from '../../lib/db';

// The one report-download control used in the customer, inspector and admin tables: just the PDF download icon.
export default function DownloadReportButton({ bookingId }) {
  const { toast } = useUI();
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.stopPropagation();                 // the row itself opens the details
    if (busy) return;
    setBusy(true);
    try { await downloadReportById(bookingId); toast.success('Report downloaded.', 'PDF ready'); }
    catch { toast.error('Could not generate the PDF.'); }
    finally { setBusy(false); }
  };
  return (
    <button type="button" className="icon-btn sm" title="Download PDF report" aria-label="Download PDF report" disabled={busy} onClick={go}>
      {busy ? <Loader2 size={18} className="spin" /> : <FileDown size={18} />}
    </button>
  );
}
