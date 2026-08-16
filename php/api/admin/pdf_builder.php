<?php
/**
 * Simple PDF Builder in pure PHP.
 * Generates standards-compliant PDF 1.4 documents without external dependencies.
 */
class PDFBuilder {
    private $buffer = '';
    private $offsets = [];
    private $objectsCount = 0;

    private function write($str) {
        $this->buffer .= $str . "\n";
    }

    private function addObj() {
        $this->objectsCount++;
        $this->offsets[$this->objectsCount] = strlen($this->buffer);
        $this->write($this->objectsCount . " 0 obj");
        return $this->objectsCount;
    }

    private function endObj() {
        $this->write("endobj");
    }

    private function escapeStr($str) {
        $str = str_replace(')', '\\)', $str);
        $str = str_replace('(', '\\(', $str);
        return $str;
    }

    public function buildPDF(string $title, string $subtitle, array $info, array $items, string $footer) {
        $this->buffer = '';
        $this->objectsCount = 0;
        $this->offsets = [];

        // Header
        $this->write("%PDF-1.4");

        // Object 1: Catalog
        $catalogId = $this->addObj();
        $this->write("<< /Type /Catalog /Pages 3 0 R >>");
        $this->endObj();

        // Object 2: Outlines
        $outlinesId = $this->addObj();
        $this->write("<< /Type /Outlines /Count 0 >>");
        $this->endObj();

        // Page Contents Stream
        $stream = "BT\n";
        $stream .= "/F1 22 Tf\n";
        $stream .= "50 780 Td\n";
        $stream .= "(" . $this->escapeStr($title) . ") Tj\n";
        $stream .= "ET\n";

        $stream .= "BT\n";
        $stream .= "/F1 12 Tf\n";
        $stream .= "50 755 Td\n";
        $stream .= "(" . $this->escapeStr($subtitle) . ") Tj\n";
        $stream .= "ET\n";

        // Draw separator line
        $stream .= "0.5 w\n";
        $stream .= "50 740 m\n";
        $stream .= "545 740 l\n";
        $stream .= "S\n";

        // Info table
        $y = 715;
        $stream .= "BT\n";
        $stream .= "/F1 10 Tf\n";
        $stream .= "50 " . $y . " Td\n";
        foreach ($info as $key => $val) {
            $stream .= "(" . $this->escapeStr("$key: $val") . ") Tj\n";
            $stream .= "0 -15 Td\n";
            $y -= 15;
        }
        $stream .= "ET\n";

        // Draw separator line
        $y -= 5;
        $stream .= "0.5 w\n";
        $stream .= "50 " . $y . " m\n";
        $stream .= "545 " . $y . " l\n";
        $stream .= "S\n";

        // Items table header
        $y -= 25;
        $stream .= "BT\n";
        $stream .= "/F1 11 Tf\n";
        $stream .= "50 " . $y . " Td\n";
        $stream .= "(Description) Tj\n";
        $stream .= "350 0 Td\n";
        $stream .= "(Value) Tj\n";
        $stream .= "ET\n";

        // Draw separator line
        $y -= 8;
        $stream .= "0.2 w\n";
        $stream .= "50 " . $y . " m\n";
        $stream .= "545 " . $y . " l\n";
        $stream .= "S\n";

        // Items rows
        $stream .= "BT\n";
        $stream .= "/F1 10 Tf\n";
        foreach ($items as $item) {
            $y -= 18;
            $stream .= "50 " . $y . " Td\n";
            $stream .= "(" . $this->escapeStr($item['desc']) . ") Tj\n";
            $stream .= "350 0 Td\n";
            $stream .= "(" . $this->escapeStr($item['value']) . ") Tj\n";
            $stream .= "-400 0 Td\n"; // return cursor back left
        }
        $stream .= "ET\n";

        // Draw bottom separator
        $y -= 25;
        $stream .= "0.5 w\n";
        $stream .= "50 " . $y . " m\n";
        $stream .= "545 " . $y . " l\n";
        $stream .= "S\n";

        // Footer
        $y -= 20;
        $stream .= "BT\n";
        $stream .= "/F1 9 Tf\n";
        $stream .= "50 " . $y . " Td\n";
        $stream .= "(" . $this->escapeStr($footer) . ") Tj\n";
        $stream .= "ET\n";

        // Object 5: Contents Stream
        $contentsId = 5;
        $streamLen = strlen($stream);

        // Object 3: Pages list
        $this->offsets[3] = strlen($this->buffer);
        $this->write("3 0 obj");
        $this->write("<< /Type /Pages /Kids [ 4 0 R ] /Count 1 >>");
        $this->endObj();

        // Object 4: Page definition
        $this->offsets[4] = strlen($this->buffer);
        $this->write("4 0 obj");
        $this->write("<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources 6 0 R >>");
        $this->endObj();

        // Object 5: Content stream body
        $this->offsets[5] = strlen($this->buffer);
        $this->write("5 0 obj");
        $this->write("<< /Length " . $streamLen . " >>");
        $this->write("stream");
        $this->buffer .= $stream;
        $this->write("\nendstream");
        $this->endObj();

        // Object 6: Resources (Fonts list)
        $this->offsets[6] = strlen($this->buffer);
        $this->write("6 0 obj");
        $this->write("<< /Font << /F1 7 0 R >> >>");
        $this->endObj();

        // Object 7: Font description
        $this->offsets[7] = strlen($this->buffer);
        $this->write("7 0 obj");
        $this->write("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        $this->endObj();

        // Cross-Reference Table
        $xrefOffset = strlen($this->buffer);
        $this->write("xref");
        $this->write("0 " . ($this->objectsCount + 1));
        $this->write("0000000000 65535 f ");
        for ($i = 1; $i <= $this->objectsCount; $i++) {
            $this->write(sprintf("%010d 00000 n ", $this->offsets[$i]));
        }

        // Trailer
        $this->write("trailer");
        $this->write("<< /Size " . ($this->objectsCount + 1) . " /Root 1 0 R >>");
        $this->write("startxref");
        $this->write($xrefOffset);
        $this->write("%%EOF");

        return $this->buffer;
    }
}
