import { uploadRoot } from "./upload-root";

describe("uploadRoot", () => {
  it("keeps an absolute UPLOAD_DIR as it is", () => {
    // join(cwd, "/Users/x/uploads") gave cwd + "/Users/x/uploads": every
    // image on the host answered 404.
    expect(uploadRoot({ UPLOAD_DIR: "/Users/x/uploads" }, "/srv/api")).toBe("/Users/x/uploads");
  });

  it("resolves a relative one against the working directory", () => {
    expect(uploadRoot({ UPLOAD_DIR: "./uploads" }, "/srv/api")).toBe("/srv/api/uploads");
  });

  it("defaults to ./uploads", () => {
    expect(uploadRoot({}, "/srv/api")).toBe("/srv/api/uploads");
  });
});
