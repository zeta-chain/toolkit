import * as fs from "fs";
import * as path from "path";
import * as handlebars from "handlebars";

const prepareData = (args: any) => {
  const argsList = args.arguments || [];
  const names = argsList.map((i: string) => i.split(":")[0]);
  const types = argsList.map((i: string) => {
    let parts = i.split(":");
    // If there's a type and it's not empty, use it; if not, default to "bytes32"
    let t =
      parts.length > 1 && parts[1].trim() !== "" ? parts[1].trim() : "bytes32";
    return t;
  });
  const pairs = names.map((v: string, i: string) => [v, types[i]]);
  const contractName = sanitizeSolidityFunctionName(args.name);

  return {
    args,
    contractName,
    contractNameUnderscore: camelToUnderscoreUpper(contractName),
    arguments: { names, types, pairs },
  };
};

const processTemplatesRecursive = async (
  template: string,
  outputDir: string,
  data: Record<string, unknown>
): Promise<void> => {
  try {
    const templateDir = path.resolve(
      __dirname,
      path.resolve(__dirname, "..", "templates", template)
    );

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
        await processTemplatesRecursive(templatePath, outputPath, data);
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

export const processTemplates = async (templateName: string, args: any) => {
  processTemplatesRecursive(
    templateName,
    path.resolve(process.cwd()),
    prepareData(args)
  );
};

const camelToUnderscoreUpper = (input: string): string => {
  return input.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
};

const sanitizeSolidityFunctionName = (str: string): string => {
  // Remove any character that's not alphanumeric or underscore
  const cleaned = str.replace(/[^a-zA-Z0-9_]/g, "");

  // If the first character is a digit, prepend with an underscore
  return cleaned.match(/^\d/) ? `_${cleaned}` : cleaned;
};
