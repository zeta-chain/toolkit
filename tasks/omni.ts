import * as fs from "fs";
import * as handlebars from "handlebars";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

const sanitizeSolidityFunctionName = (str: string): string => {
  // Remove any character that's not alphanumeric or underscore
  const cleaned = str.replace(/[^a-zA-Z0-9_]/g, "");

  // If the first character is a digit, prepend with an underscore
  return cleaned.match(/^\d/) ? `_${cleaned}` : cleaned;
};

const processTemplates = async (
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

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const templateDir = path.resolve(__dirname, "..", "templates", "omnichain");
  const outputDir = path.resolve(process.cwd());
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

  const data = {
    args,
    arguments: { names, pairs, types },
    contractName: sanitizeSolidityFunctionName(args.name),
  };

  processTemplates(templateDir, outputDir, data);

  const configPath = path.resolve(process.cwd(), "hardhat.config.ts");
  let hardhatConfigContents = fs.readFileSync(configPath, "utf8");

  // Add the omnichain tasks to the hardhat.config.ts file
  ["deploy", "interact"].forEach((task) => {
    const content = `import "./tasks/${task}";\n`;
    if (!hardhatConfigContents.includes(content)) {
      hardhatConfigContents = content + hardhatConfigContents;
    }
  });

  fs.writeFileSync(configPath, hardhatConfigContents);
};

export const omniTask = task(
  "omni",
  "Generate code for an omnichain smart contract",
  main
)
  .addPositionalParam("name", "Name of the contract")
  .addOptionalVariadicPositionalParam(
    "arguments",
    "Arguments for a crosschain call (e.g. dest:address to:bytes32 output:uint256)"
  );
