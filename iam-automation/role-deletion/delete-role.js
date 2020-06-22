let AWS = require("aws-sdk");
let iam = new AWS.IAM({apiVersion: '2010-05-08'});



let params = {
    MaxItems: 5
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
                    
                    console.log("Role last used timestamp: " + roleDetails.Role.RoleLastUsed.LastUsedDate)

                    if (roleDetails.Role.RoleLastUsed.LastUsedDate == undefined) { 
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
                                            console.log("Attached Policies to be detached: " + policyParams)
                                            console.log("Removal response: " + removedPolicy)
                                        }
                                    });
                                });
                                
                                let deleteRoleParams = {
                                    RoleName: role.RoleName
                                }

                                iam.deleteRole(deleteRoleParams, function(err, deletedRole) {
                                    if (err) {
                                        console.log(err)
                                    } else {
                                        console.log("Role to be deleted: " + role.RoleName)
                                        console.log(deletedRole)
                                    }
                                })
                            }
                        })
                    }
                }
            })
        })
    }
});
