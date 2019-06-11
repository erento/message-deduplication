buildImage = docker.image("node:11.15")

node {
    stage("checkout") {
        checkout scm
    }

    stage("tests") {
        agent {
            docker {
                image "node:11.15"
            }
        }

        buildImage.inside() {
            sh "npm i"
            sh "npm run lint"
            sh "npm run test-ci"
        }
    }
}
