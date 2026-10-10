import pymupdf


def make_pdf(pages: list[str | None], password: str | None = None) -> bytes:
    """Build a PDF. A string is a page with that text (long text is wrapped);
    None is a 'scanned' page (image only)."""
    doc = pymupdf.open()
    for content in pages:
        page = doc.new_page()
        if content is None:
            pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 64, 64))
            pix.clear_with(180)
            page.insert_image(pymupdf.Rect(50, 50, 300, 300), pixmap=pix)
        elif content:
            if len(content) <= 80:
                page.insert_text((72, 72), content)
            else:
                rc = page.insert_textbox(pymupdf.Rect(50, 50, 545, 790), content, fontsize=8)
                assert rc >= 0, "test text does not fit on the page"
    if password:
        data = doc.tobytes(
            encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw=password, owner_pw=password + "-owner"
        )
    else:
        data = doc.tobytes()
    doc.close()
    return data
