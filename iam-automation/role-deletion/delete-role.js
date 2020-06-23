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
                    console.log("ERROR FOR: " + role.RoleName + " MESSAGE: " + err.toString().substring(0, 20))
                } else {

                    roleLastUsedTimestamp = new Date(roleDetails.Role.RoleLastUsed.LastUsedDate)

                    cutoffDate = new Date(new Date().setDate(new Date().getDate()-180))

                    if (roleDetails.Role.RoleLastUsed.LastUsedDate == undefined || roleLastUsedTimestamp < cutoffDate) {
                        console.log(roleDetails.Role.RoleName + " is in the deletion time period")
                        console.log(roleLastUsedTimestamp + " < " + cutoffDate)

                        console.log("ROLE TO DELETE: " + roleDetails.Role.RoleName)
                        console.log("===========================================================\n")

                        let instanceProfileParams = {
                            RoleName: role.RoleName
                        }
    
                        iam.listInstanceProfilesForRole(instanceProfileParams, function(err, removedProfile) {
                            if (err) {
                                console.log("ERROR FOR: " + role.RoleName + " MESSAGE: " + err.toString().substring(0, 20))
                            } else {
                                if (removedProfile.InstanceProfiles.length > 0) {
                                    console.log("Instance Profile names for: " + role.RoleName)
                                    console.log(removedProfile.InstanceProfiles)
                                    console.log("===========================================================\n")
                                }
                                
                                removedProfile.InstanceProfiles.forEach(function(profile) {
                                    let removeProfileParams = {
                                        InstanceProfileName: profile.InstanceProfileName,
                                        RoleName: role.RoleName
                                    }
    
                                    iam.removeRoleFromInstanceProfile(removeProfileParams, function(err, removed) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            console.log("Removed instance profile for: " + role.RoleName);
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
                                console.log("DELETE ERROR FOR: " + role.RoleName);
                                console.log(err.toString().substring(0, 100));
                                console.log("===========================================================\n")
                            } else {
                                console.log("ROLE DELETED: " + role.RoleName)
                            }
                        })
                    }

                }
            })
        })
    }
});
