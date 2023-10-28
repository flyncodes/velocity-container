import fs from 'node:fs'
import os from 'node:os'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || ''
const PAPER_PROJECT = 'velocity'

// Get tags
const allTags = await githubTags()
console.log(allTags)

// Get last build number
const projectVersion = await latestProjectVersion()
const latestBuild = await latestProjectBuild(projectVersion)
console.log(latestBuild)

// Compare against current build number
if (!allTags.includes('build-' + latestBuild.build)) {
  // If the current build number is higher, build the Dockerfile and publish
  console.log('Build #' + latestBuild.build + ' hasn\'t been published before.')
  githubOutput('PROJECT_VERSION', projectVersion)
  githubOutput('BUILD_TAG', 'build-' + latestBuild.build)
  githubOutput('DOWNLOAD_URL', downloadUrl(projectVersion, latestBuild))
  console.log(fs.readFileSync(process.env.GITHUB_OUTPUT, "utf8"))
} else {
  // Exit 0 so the action doesn't fail but wont continue due to DOWNLOAD_URL not being set
  console.log('Docker container is up-to-date with the latest Velocity build!')
  process.exit(0)
}

async function githubTags() {
  const githubVersions = await fetch(`https://api.github.com/users/${githubOwner()}/packages/container/${githubRepo()}/versions`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  const allTags = []

  if (githubVersions.ok) {
    const response = await githubVersions.json()
    const lastFiveVersions = response.slice(0, 5)
    lastFiveVersions.forEach(version => allTags.push(...version.metadata.container.tags))
  } else {
    const response = await githubVersions.json()
    if (response.message !== 'Package not found.') {
      console.error('githubVersions returned not-ok.')
      console.error(response)
      process.exit(1)
    }
  }

  return allTags
}

async function latestProjectVersion() {
  const projectInfo = await fetch(`https://api.papermc.io/v2/projects/${PAPER_PROJECT}`, { headers: { Accept: 'application/json' } })

  if (projectInfo.ok) {
    const response = await projectInfo.json()
    return response.versions.at(-1)
  } else {
    console.error('projectInfo returned not-ok.')
    process.exit(1)
  }
}

async function latestProjectBuild(projectVersion) {
  const projectBuilds = await fetch(`https://api.papermc.io/v2/projects/${PAPER_PROJECT}/versions/${projectVersion}/builds`, { headers: { Accept: 'application/json' } })

  if (projectBuilds.ok) {
    const response = await projectBuilds.json()
    return response.builds.at(-1)
  } else {
    console.error('projectBuilds returned not-ok.')
    process.exit(1)
  }
}

function downloadUrl(projectVersion, build) {
  return `https://api.papermc.io/v2/projects/${PAPER_PROJECT}/versions/${projectVersion}/builds/${build.build}/downloads/${build.downloads.application.name}`
}

function githubOutput(key, value) {
  if (process.env.GITHUB_OUTPUT === undefined) {
    console.log('GITHUB_OUTPUT', `${key}="${value}"`)
  } else {
    // Using appendFileSync is fine here as it's not used a lot
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}="${value}"${os.EOL}`);
  }
}

function githubRepo() {
  return GITHUB_REPOSITORY.split('/')[1]
}

function githubOwner() {
  return GITHUB_REPOSITORY.split('/')[0]
}
