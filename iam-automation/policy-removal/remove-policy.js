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

// List the number of roles in AWS account based on user input
let roles = iam.listRoles(params, function(err, data) {
    if (err) {
        console.log(err);
    } else {

        // Get the array of roles from the "data" response
        let roles = data.Roles;
        
        // Iterate of the array of roles
        roles.forEach(function(role) {

            // Set required parameter of RoleName to use GetRole AWS API
            let params = {
                RoleName: role.RoleName
            }

            iam.getRole(params, function(err, roleDetails) {
                if (err) {
                    console.log("GET ROLE ERROR FOR: " + role.RoleName + " MESSAGE: " + err.toString().substring(0, 20));

                } else if (roleDetails.Role.RoleLastUsed.LastUsedDate == undefined){
                        
                    console.log("ROLE TO DELETE: " + roleDetails.Role.RoleName)

                    iam.listAttachedRolePolicies(params, function(err, rolePolicies) {
                        if (err) {
                            console.log("LIST POLICY ERROR FOR: " + role.RoleName + " MESSAGE: " + err.toString().substring(0, 20));
                         } else {

                             let policies = rolePolicies.AttachedPolicies;

                             if (policies.length > 0) {
                                console.log("Policies are attached to " + role.RoleName)

                                policies.forEach(function(policy) {

                                    let policyParams = {
                                        PolicyArn: policy.PolicyArn,
                                        RoleName: role.RoleName
                                    }
   
                                    iam.detachRolePolicy(policyParams, function(err, removedPolicy) {
                                        if (err) {
                                            console.log("DETACH POLICY ERROR FOR: " + role.RoleName + " MESSAGE: " + err.toString().substring(0, 20));
                                        } else {
                                            console.log("Attached policy to be detached for " + roleDetails.Role.RoleName + ": " + policyParams.PolicyArn)
                                            console.log("Removal response: " + removedPolicy.ResponseMetadata.RequestId + "\n")
                                        }
                                    });
                                });
                             }
                         }
                    });

                    iam.listRolePolicies(params, function(err, inlinePolicies) {
                        if (err) {
                            console.log("GET INLINE POLICY ERROR FOR: " + role.RoleName + " MESSAGE: " + err.toString().substring(0, 20))
                        } else {

                            let inline = inlinePolicies.PolicyNames;
                            
                            inline.forEach(function(inlinePolicy) {
                                let inlineParams = {
                                    PolicyName: inlinePolicy,
                                    RoleName: role.RoleName
                                }

                                iam.deleteRolePolicy(inlineParams, function(err, removedInline) {
                                    if (err) {
                                        console.log("DETACH INLINE ERROR FOR: " + role.RoleName + " MESSAGE: " + err.toString().substring(0, 20));
                                    } else {
                                        console.log("Attached inline policy detached for " + roleDetails.Role.RoleName);
                                    }
                                })
                            })
                        }
                    })
                }
            })
        })
    }
});

