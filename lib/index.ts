import * as fs from "fs";
import * as path from "path";
import * as handlebars from "handlebars";

export const processTemplates = async (
  templateDir: string,
  outputDir: string,
  data: Record<string, unknown>
): Promise<void> => {
  try {
    templateDir = path.resolve(__dirname, templateDir);

    const files = fs.readdirSync(templateDir);

    for (const file of files) {
      const templatePath = path.join(templateDir, file);

      // Compiling filename as a template
      const filenameTemplate = handlebars.compile(file);
      const filename = filenameTemplate(data);

      // Replacing .hbs extension if the file was a handlebars template
      const outputPath = path.join(outputDir, filename.replace(".hbs", ""));

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      if (fs.lstatSync(templatePath).isDirectory()) {
        // If file is a directory, recursively process it
        await processTemplates(templatePath, outputPath, data);
      } else if (path.extname(file) === ".hbs") {
        const templateContent = fs.readFileSync(templatePath, "utf-8");
        const template = handlebars.compile(templateContent);
        const outputContent = template(data);
        fs.writeFileSync(outputPath, outputContent);
      } else {
        fs.copyFileSync(templatePath, outputPath);
      }
    }
  } catch (error) {
    console.error(`Error processing templates: ${error}`);
  }
};

export const camelToUnderscoreUpper = (input: string): string => {
  return input.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
};

export const sanitizeSolidityFunctionName = (str: string): string => {
  // Remove any character that's not alphanumeric or underscore
  const cleaned = str.replace(/[^a-zA-Z0-9_]/g, "");

  // If the first character is a digit, prepend with an underscore
  return cleaned.match(/^\d/) ? `_${cleaned}` : cleaned;
};
