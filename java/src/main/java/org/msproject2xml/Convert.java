package org.msproject2xml;

import java.io.File;
import org.mpxj.ProjectFile;
import org.mpxj.mspdi.MSPDIWriter;
import org.mpxj.reader.UniversalProjectReader;

public final class Convert {

    private Convert() {}

    public static void main(String[] args) {
        if (args.length < 1 || args.length > 2) {
            System.err.println("Usage: mpxj-convert <input> [output.xml]");
            System.exit(2);
        }

        File input = new File(args[0]);
        if (!input.isFile()) {
            System.err.println("Input not found: " + args[0]);
            System.exit(2);
        }

        File output = args.length == 2
            ? new File(args[1])
            : new File(stripExt(input.getPath()) + ".xml");

        try {
            ProjectFile project = new UniversalProjectReader().read(input);
            if (project == null) {
                System.err.println("Unsupported or unreadable input format: " + args[0]);
                System.exit(1);
            }
            new MSPDIWriter().write(project, output);
        } catch (Exception e) {
            System.err.println("Conversion failed: " + e.getMessage());
            System.exit(1);
        }
    }

    private static String stripExt(String path) {
        int dot = path.lastIndexOf('.');
        int sep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        return dot > sep ? path.substring(0, dot) : path;
    }
}
