projectBaseName = "message-deduplication"
nodeImage = "node:11.15"
shortLabel = projectBaseName.size() >= 10 ? projectBaseName.substring(0, 10) : projectBaseName
buildLabel = "${shortLabel}-${UUID.randomUUID().toString()}"

podTemplate(label: "global") {
    podTemplate(
        label: buildLabel,
        containers: [
            containerTemplate(name: "node-image", image: nodeImage, ttyEnabled: true, command: "cat"),
        ],
        nodeSelector: "type=worker",
    ) {
        node(buildLabel) {
            stage("checkout") {
                checkout scm
            }

            stage("prepare dependencies") {
                container(name: "node-image") {
                    sh(script: "npm install")
                }
                milestone(label: "dependencies ready")
            }

            stage("lint") {
                container(name: "node-image") {
                    sh(script: "npm run lint")
                }
                milestone(label: "linting complete")
            }

            stage("unit test") {
                container(name: "node-image") {
                    sh(script: "npm run test-ci")
                }
                milestone(label: "unit tests complete")
            }
        }
    }
}
