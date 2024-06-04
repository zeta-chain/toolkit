const fs = require("fs");
const path = require("path");

const addNewlineToFile = (filePath) => {
  const data = fs.readFileSync(filePath, "utf8");
  if (!data.endsWith("\n")) {
    fs.writeFileSync(filePath, data + "\n", "utf8");
  }
};

const processDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith(".js")) {
      addNewlineToFile(fullPath);
    }
  });
};

const docsDir = path.resolve(__dirname, "../docs");
processDirectory(docsDir);
