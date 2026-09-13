import { useRef, useState } from "react";
import { uploadImage } from "./api.js";

/** Attach an image to a text. Shows a thumbnail once uploaded; the image is sent above the text as MMS. */
export default function ImagePicker({ value, onChange, label = "Image" }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-field">
      <span>{label}</span>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={pick} />
      {value ? (
        <div className="adm-imgpick">
          <img src={value} alt="" />
          <div className="adm-imgpick-actions">
            <button type="button" className="adm-link" onClick={() => ref.current.click()} disabled={busy}>Replace</button>
            <button type="button" className="adm-link adm-danger" onClick={() => onChange(null)} disabled={busy}>Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" className="adm-btn adm-btn-dashed" onClick={() => ref.current.click()} disabled={busy}>
          {busy ? "Uploading…" : "+ Attach image"}
        </button>
      )}
      <small>{error ? <span className="adm-error">{error}</span> : "Sent as a picture message, shown above the text."}</small>
    </div>
  );
}
