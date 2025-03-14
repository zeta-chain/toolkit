import * as fs from "fs";
import * as handlebars from "handlebars";
import * as path from "path";

const numberTypes = [
  "int",
  "int8",
  "int16",
  "int32",
  "int128",
  "int256",
  "uint",
  "uint8",
  "uint32",
  "uint16",
  "uint128",
  "uint256",
];
const addressTypes = ["address"];
const boolTypes = ["bool"];
const bytesTypes = ["bytes32"];
const stringTypes = ["string"];
const allTypes = [
  ...numberTypes,
  ...addressTypes,
  ...boolTypes,
  ...bytesTypes,
  ...stringTypes,
];

const capitalizeFirstChar = (input: string): string => {
  if (input.length === 0) {
    return input;
  }

  const firstChar = input.charAt(0).toUpperCase();
  const restOfTheString = input.slice(1);

  return firstChar + restOfTheString;
};

export interface PrepareDataArgs {
  arguments: string[];
  fees: string;
  name: string;
}

const prepareData = (args: PrepareDataArgs) => {
  const argsList = args.arguments || [];
  const names = argsList.map((i: string) => i.split(":")[0]);
  const types = argsList.map((i: string) => {
    const t = i.split(":")[1];
    if (t === undefined) {
      return "string";
    }
    if (!allTypes.includes(t)) {
      throw new Error(
        `Invalid type "${t}", must be one of ${allTypes.join(", ")}`
      );
    }
    return t;
  });
  const pairs: [string, string][] = names.map((v: string, i: number) => [
    v,
    types[i],
  ]);
  const pairsWithDataLocation = pairs.map((pair) => {
    if (pair[1] === "string") {
      return [pair[0], "string memory"];
    } else {
      return pair;
    }
  });
  const contractName = sanitizeSolidityFunctionName(args.name);
  const casts = pairs.map((pair) => {
    const n = capitalizeFirstChar(pair[0]);
    const type = pair[1];

    if (numberTypes.includes(type)) {
      return [n, `hre.ethers.BigNumber.from(args.${pair[0]})`];
    }

    if (addressTypes.includes(type)) {
      return [n, `hre.ethers.utils.getAddress(args.${pair[0]})`];
    }

    if (boolTypes.includes(type)) {
      return [n, `JSON.parse(args.${pair[0]})`];
    }

    if (bytesTypes.includes(type)) {
      return [n, `hre.ethers.utils.toUtf8Bytes(args.${pair[0]})`];
    }

    // Default case is "string" and other unexpected cases.
    return [n, `args.${pair[0]}`];
  });

  const feesNative = args.fees === "native";

  const argsListNotEmpty = argsList.length > 0;

  return {
    args,
    arguments: {
      argsListNotEmpty,
      casts,
      feesNative,
      names,
      pairs,
      pairsWithDataLocation,
      types,
    },
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
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error(`Error processing templates: ${errorMessage}`);
  }
};

export const processTemplates = async (
  templateName: string,
  args: PrepareDataArgs
) => {
  await processTemplatesRecursive(
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
