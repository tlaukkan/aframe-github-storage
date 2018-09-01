const GitHub = require('github-api');

exports.GithubClient = class {
    constructor (userName, token) {
        this.github = new GitHub({token: token});
        this.userName = userName;
        this.repository = null;
        this.branchName = null;
    }

    async setRepo(repoName) {
        this.repositoryName = repoName;
        let repos = await this.listRepos();
        if (repos.map(r => r.name).includes(repoName)) {
            this.repository = this.github.getRepo(this.userName, repoName);
        } else {
            console.log('creating repo: ' + repoName);
            await this.createRepo(repoName);
            this.repository = this.github.getRepo(this.userName, repoName);
        }
    };

    async setBranch(branchName) {
        let branches = await this.repository.listBranches();
        let exists = branches.data.find( branch => branch.name === branchName );
        if (!exists) {
            await this.repository.createBranch('master', branchName)
            this.branchName = branchName;
        } else {
            this.branchName = branchName;
        }
    };

    async listRepos() {
        return await new Promise((resolve) => this.github.getUser().listRepos((err, repos) => resolve(repos)));
    }

    async createRepo(repoName) {
        await this.github.getUser().createRepo({ name: repoName, private: false, auto_init: true });
    };

    async getHeadCommitHash() {
        let ref = await this.repository.getRef('heads/' + this.branchName);
        return (await this.repository.getCommit(ref.data.object.sha)).data.sha;
    }

    async getFile(path) {
        try {
            let response = await this.repository.getSha(this.branchName, path);
            return Buffer.from(response.data.content, 'base64').toString();
        } catch (e) {
            if (e.response && e.response.status === 404) {
                return null;
            } else {
                throw e;
            }
        }
    };

    async writeFile(path, content, message, author) {
        await this.repository.writeFile(this.branchName, path, content, message, { author: author, encode: true });
    };

    async deleteFile(path) {
        await this.repository.deleteFile(this.branchName, path);
    };

    async writeFiles(files, message) {
        let ref = await this.repository.getRef('heads/' + this.branchName);
        let latestCommit = await this.repository.getCommit(ref.data.object.sha);

        let filesToCommit = await Promise.all(files.map(async (file) => {
            let blob = await this.repository.createBlob(file.content);
            return { sha: blob.data.sha, path: file.path, mode: '100644', type: 'blob' };
        }));

        let tree = await this.repository.createTree(filesToCommit, latestCommit.data.tree.sha);
        let newCommit = await this.repository.commit(latestCommit.data.sha, tree.data.sha, message);
        await this.repository.updateHead('heads/' + this.branchName, newCommit.data.sha);
    };

};