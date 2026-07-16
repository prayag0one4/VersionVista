const Repo = require("./repo.model");
const Commit = require("../commit/commit.model");
const Diff = require("../diff/diff.model");
const FileChange = require("../file_change/file_change.model");
const CodeSnapshot = require("../code_snapshot/code_snapshot.model");

const findByGithubUrl = (githubUrl) => Repo.findOne({ githubUrl });

const createRepo = ({ name, owner, githubUrl }) =>
  Repo.create({ name, owner, githubUrl });

const findOrCreate = async (githubUrl, name, owner) => {
  let repo = await findByGithubUrl(githubUrl);

  if (!repo) {
    repo = await createRepo({ name, owner, githubUrl });
  }

  return repo;
};

const getAllRepos = () => Repo.find({}).sort({ createdAt: -1 });

const getRepoById = (id) => Repo.findById(id);

const deleteRepoById = async (id) => {
  const repo = await Repo.findById(id);
  if (!repo) return null;

  await Promise.all([
    Commit.deleteMany({ repoId: id }),
    Diff.deleteMany({ repoId: id }),
    FileChange.deleteMany({ repoId: id }),
    CodeSnapshot.deleteMany({ repoId: id }),
  ]);

  await Repo.findByIdAndDelete(id);
  return repo;
};

module.exports = {
  findByGithubUrl,
  createRepo,
  findOrCreate,
  getAllRepos,
  getRepoById,
  deleteRepoById
};
