const fs = require("fs");
const path = require("path");

const gradlePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@react-native-cookies",
  "cookies",
  "android",
  "build.gradle"
);

if (fs.existsSync(gradlePath)) {
  let content = fs.readFileSync(gradlePath, "utf8");
  if (content.includes("jcenter()")) {
    content = content.replace(/jcenter\(\)/g, "mavenCentral()");
    fs.writeFileSync(gradlePath, content, "utf8");
    console.log("Patched @react-native-cookies jcenter() -> mavenCentral()");
  }
}
