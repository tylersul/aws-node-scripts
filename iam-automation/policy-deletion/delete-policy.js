// ================================================================== //
// ====================== Library Requirement ======================= //
// ================================================================== //
let AWS = require("aws-sdk");
let iam = new AWS.IAM({apiVersion: '2010-05-08'});

// ================================================================== //
// ====================== Process User Input ======================== //
// ================================================================== //
// User input determines the amount of roles to list & delete if they fit the criteria
let items = process.argv[2];

let params = {
    MaxItems: items
}


let policies = iam.listPolicies(params, function(err, data) {
    if (err) {
        console.log(err)
    } else {

        let policies = data.Policies

        policies.forEach(function(policy) {
            if (policy.AttachmentCount == 0) {
                console.log("Policy with zero attachments: " + policy.PolicyName)

                let listPolicyParams = {
                    PolicyArn: policy.Arn
                }
                ;
                iam.listPolicyVersions(listPolicyParams, function(err, policyVersion) {
                    if (err) {
                        console.log(err)
                    } else {

                        let policyVersions = policyVersion.Versions

                        if (policyVersions.length > 1) {

                            console.log("MULTIPLE POLICY VERSIONS FOR: " + policy.PolicyName);

                            policyVersions.forEach(function(version) {
                                if (version.IsDefaultVersion == false) {
    
                                    let deleteVersionParams = {
                                        PolicyArn: policy.Arn,
                                        VersionId: version.VersionId
                                    }
    
                                    iam.deletePolicyVersion(deleteVersionParams, function(err, deletedVersion) {
                                        if (err) {
                                            console.log("DELETE VERSION ERROR FOR: " + policy.PolicyName)
                                            console.log(err.toString().substring(0, 100))
                                            console.log("===========================================================\n")
                                        } else {
                                            console.log("DELETED POLICY VERSION FOR: " + policy.PolicyName)
                                        }
                                    })
                                }
                            })
                        } 

                    }
                })
                let deletePolicyParams = {
                    PolicyArn: policy.Arn
                }

                iam.deletePolicy(deletePolicyParams, function(err, deletedPolicy) {
                    if (err) {
                        console.log("DELETE ERROR FOR: " + policy.PolicyName)
                        console.log(err.toString().substring(0, 100))
                    } else {
                        console.log("DELETED POLICY: " + policy.PolicyName)
                    }
                })
            }
        })
    }
})
