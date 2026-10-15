# V4 Native Attempt: Nonfinal, Connection Failure

Input: `art/illustration-v4.png`, SHA-256
`8803671e69bef250c8699b672e5895cbab7c6600460850b6d8c362efa865d1d6`.

Parent explicitly gave native GO after frame QA. Frame QA found the face,
sword tip and both boots visible without abnormal occlusion. See
`../../qa/illustration-v4/frame-preview.png` (approximate text, QA only).

The existing bridge failed at `New-Object -ComObject Photoshop.Application.190`:
`80080005 / CO_E_SERVER_EXEC_FAILURE`. No JSX execution, PSD output or new
native PNG occurred. No production file changed. The prepared work, request,
input hashes, code copies and complete error log are preserved here.

The parent subsequently requested a subtler reference smile and is generating
v5. This v4 attempt is NOT final and must not be published or retried without
a new explicit instruction. Original absolute paths inside archived JSONs
refer to the pre-archive location; the files have been moved intact, not edited.

Read-only process inspection found Photoshop 2026 PID 33840 responding with
no main window handle. It was not killed, restarted or otherwise manipulated.
No further COM or native execution was attempted after the suspension request.
