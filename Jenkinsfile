buildImage = docker.image('node:11.3')

node {
    stage('checkout') {
        checkout scm
    }

    stage('Tests') {
        agent {
            docker {
                image 'node:11.3'
            }
        }

        buildImage.inside() {
            sh 'npm i'
            sh 'npm run lint'
            sh 'npm run test-ci'
        }
    }
}
