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

let roles = iam.listRoles(params, function(err, data) {
    if (err) {
        console.log(err);
    } else {
        let roles = data.Roles;
        
        roles.forEach(function(role) {
            let params = {
                RoleName: role.RoleName
            }
            iam.getRole(params, function(err, roleDetails) {
                if (err) {
                    console.log(err)
                } else {
                    
                    if (roleDetails.Role.RoleLastUsed.LastUsedDate == undefined && (roleDetails.Role.RoleName != "AWS-InnovationLabs-Chicago-ReadOnly" ||
                            roleDetails.Role.RoleName != "AWS-InnovationLabs-Chicago-Admin")) { 
                        
                        console.log("ROLE: " + roleDetails.Role.RoleName + "\n LAST USED: " + roleDetails.Role.RoleLastUsed.LastUsedDate + "\n")
                        
                        iam.listAttachedRolePolicies(params, function(err, rolePolicies) {
                            if (err) {
                                console.log(err);
                            } else {

                                let policies = rolePolicies.AttachedPolicies;

                                policies.forEach(function(policy) {

                                    let policyParams = {
                                        PolicyArn: policy.PolicyArn,
                                        RoleName: role.RoleName
                                    }

                                    iam.detachRolePolicy(policyParams, function(err, removedPolicy) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            console.log("Attached policy to be detached for " + roleDetails.Role.RoleName + ": " + policyParams.PolicyArn)
                                            console.log("Removal response: " + removedPolicy.ResponseMetadata.RequestId + "\n")
                                        }
                                    });
                                });
                            }
                        });

                        let instanceProfileParams = {
                            RoleName: role.RoleName
                        }

                        iam.listInstanceProfilesForRole(instanceProfileParams, function(err, removedProfile) {
                            if (err) {
                                console.log(err)
                            } else {
                                console.log("Instance Profile names for: " + role.RoleName)
                                console.log(removedProfile)
                                console.log("===========================================================\n")
                                
                                removedProfile.InstanceProfiles.forEach(function(profile) {
                                    let removeProfileParams = {
                                        InstanceProfileName: profile.InstanceProfileName,
                                        RoleName: role.RoleName
                                    }

                                    iam.removeRoleFromInstanceProfile(removeProfileParams, function(err, removed) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            console.log("Removed instance profile");
                                            console.log(removed)
                                        }
                                    })
                                })
                            }
                        })

                        let deleteRoleParams = {
                            RoleName: role.RoleName
                        }

                        iam.deleteRole(deleteRoleParams, function(err, deletedRole) {
                            if (err) {
                                console.log("ERROR FOR: " + role.RoleName + "\n");
                                console.log(err + "\n");
                                console.log("===========================================================\n")
                            } else {
                                console.log("ROLE DELETED: " + role.RoleName)
                                console.log(deletedRole)
                            }
                        })
                    }
                }
            })
        })
    }
});
