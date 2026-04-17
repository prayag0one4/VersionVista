const Repo = require("./repo.model");

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

module.exports = {
  findByGithubUrl,
  createRepo,
  findOrCreate,
  getAllRepos,
  getRepoById
};
