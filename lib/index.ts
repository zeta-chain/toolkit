import * as fs from "fs";
import * as handlebars from "handlebars";
import * as path from "path";

const numberTypes = [
  "int",
  "int8",
  "int16",
  "int128",
  "int256",
  "uint",
  "uint8",
  "uint16",
  "uint128",
  "uint256",
];
const addressTypes = ["address"];
const boolTypes = ["bool"];
const bytesTypes = ["bytes32"];
const allTypes = [...numberTypes, ...addressTypes, ...boolTypes, ...bytesTypes];

const capitalizeFirstChar = (input: string): string => {
  if (input.length === 0) {
    return input; // Return the empty string as is
  }

  const firstChar = input.charAt(0).toUpperCase();
  const restOfTheString = input.slice(1);

  return firstChar + restOfTheString;
};

const prepareData = (args: any) => {
  const argsList = args.arguments || [];
  const names = argsList.map((i: string) => i.split(":")[0]);
  const types = argsList.map((i: string) => {
    let parts = i.split(":");
    if (parts.length === 1) {
      return "bytes32";
    }
    const t = parts[1].trim();
    return allTypes.includes(t) ? t : "bytes32";
  });
  const pairs = names.map((v: string, i: string) => [v, types[i]]);
  const contractName = sanitizeSolidityFunctionName(args.name);
  const casts = pairs.map((p: any) => {
    const n = capitalizeFirstChar(p[0]);
    const type = p[1];

    if (numberTypes.includes(type)) {
      return [n, `hre.ethers.BigNumber.from(args.${p[0]})`];
    }

    if (addressTypes.includes(type)) {
      return [n, `hre.ethers.utils.getAddress(args.${p[0]})`];
    }

    if (boolTypes.includes(type)) {
      return [n, `JSON.parse(args.${p[0]})`];
    }

    // Default case is "bytes32" and other unexpected cases.
    return [n, `hre.ethers.utils.toUtf8Bytes(args.${p[0]})`];
  });

  return {
    args,
    arguments: { names, pairs, types, casts },
    contractName,
    contractNameUnderscore: camelToUnderscoreUpper(contractName),
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
