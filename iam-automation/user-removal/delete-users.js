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

let users = iam.listUsers(params, function(err, foundUsers) {
    if (err) {
        console.log(err);
    } else {
        let users = foundUsers.Users;
        
        users.forEach(function(user) {
            
        if (user.PasswordLastUsed == undefined) {
            console.log("===========================================================")
            console.log("No Console Password for: " + user.UserName)
            console.log("===========================================================\n")

            let accessKeyParams = {
                UserName: user.UserName
            }
            
            iam.listAccessKeys(accessKeyParams, function(err, accessDetail) {
                if (err) {
                    console.log(err);
                } else {

                    if (accessDetail.AccessKeyMetadata.length < 1) {
                        console.log("===========================================================")
                        console.log("No access key for: " + user.UserName +". Moving to delete.");
                        console.log("===========================================================\n");
                    
                        let userPolicyParams = {
                            UserName: user.UserName
                        }

                        iam.listUserPolicies(userPolicyParams, function(err, userPolicy) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("===========================================================")
                                console.log(userPolicy)
                                console.log("===========================================================\n");
                            }
                        });

                        // TODO: DETACH USER POLICIES IF THEY EXIST

                        // TODO: REMOVE USER FROM GROUP
                        
                        let deleteProfileParams = {
                            UserName: user.UserName
                        }

                        iam.deleteLoginProfile(deleteProfileParams, function(err, deletedProfile) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("===========================================================")
                                console.log(user.UserName + " has not been active in 180 days & their login profile has been deleted.");
                                console.log(deleteProfile);
                                console.log("===========================================================\n")
                            }
                        });

                        let deleteUserParams = {
                            UserName: user.UserName
                        }

                        iam.deleteUser(deleteUserParams, function(err, deletedUser) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("===========================================================")
                                console.log(user.UserName + " has not been active in 180 days & has been deleted.");
                                console.log(deletedUser);
                                console.log("===========================================================\n")
                            }
                        });

                    } else {
                        let accessKeys = accessDetail.AccessKeyMetadata
                    
                        accessKeys.forEach(function(key) {
    
                            let accessUseParams = {
                                AccessKeyId: key.AccessKeyId
                            }
    
                            iam.getAccessKeyLastUsed(accessUseParams, function(err, keyDetail) {
                                if (err) {
                                    console.log(err)
                                } else {
    
                                    userLastUsedTimestamp = new Date(keyDetail.AccessKeyLastUsed.LastUsedDate)
    
                                    cutoffDate = new Date(new Date().setDate(new Date().getDate()-180))
                                    
                                    if (userLastUsedTimestamp < cutoffDate || keyDetail.AccessKeyLastUsed.LastUsedDate == undefined) {
                                        console.log("===========================================================")
                                        console.log("Access key to delete: " + key.UserName)
                                        console.log("===========================================================\n")
    
                                        let deleteParams = {
                                            AccessKeyId: key.AccessKeyId,
                                            UserName: user.UserName
                                        }
    
                                        iam.deleteAccessKey(deleteParams, function(err, deletedKey) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log("===========================================================")
                                                console.log(user.UserName + " has a key ID'd: " + key.AccessKeyId + " that was inactive for > 180 and DELETED.")
                                                console.log(deletedKey)
                                                console.log("===========================================================\n");
                                            }
                                        });
    
                                        let userPolicyParams = {
                                            UserName: user.UserName
                                        }
    
                                        iam.listUserPolicies(userPolicyParams, function(err, userPolicy) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log("===========================================================")
                                                console.log(userPolicy)
                                                console.log("===========================================================\n");
                                            }
                                        })
    
                                        // let deleteProfileParams = {
                                        //     UserName: user.UserName
                                        // }
    
                                        // iam.deleteLoginProfile(deleteProfileParams, function(err, deletedProfile) {
                                        //     if (err) {
                                        //         console.log(err);
                                        //     } else {
                                        //         console.log("===========================================================")
                                        //         console.log(user.UserName + " has not been active in 180 days & their login profile has been deleted.");
                                        //         console.log(deleteProfile);
                                        //         console.log("===========================================================\n")
                                        //     }
                                        // })
    
                                        // let deleteUserParams = {
                                        //     UserName: user.UserName
                                        // }
    
                                        // iam.deleteUser(deleteUserParams, function(err, deletedUser) {
                                        //     if (err) {
                                        //         console.log(err);
                                        //     } else {
                                        //         console.log("===========================================================")
                                        //         console.log(user.UserName + " has not been active in 180 days & has been deleted.");
                                        //         console.log(deletedUser);
                                        //         console.log("===========================================================\n")
                                        //     }
                                        // })
                                    } else {
                                        console.log("===========================================================")
                                        console.log(keyDetail.UserName + " has a key last used: " + keyDetail.AccessKeyLastUsed.LastUsedDate + ". Will NOT be deleted.")
                                        console.log("===========================================================\n")
                                    }
    
                                }
                            })
                        })
                    }
                }
            })
        } else {
            console.log("Password for user: " + user.UserName + " Last Used: " + user.PasswordLastUsed)

            iam.listAccessKeys(accessKeyParams, function(err, accessDetail) {
                if (err) {
                    console.log(err);
                } else {

                    let accessKeys = accessDetail.AccessKeyMetadata
                    
                    accessKeys.forEach(function(key) {

                        let accessUseParams = {
                            AccessKeyId: key.AccessKeyId
                        }

                        iam.getAccessKeyLastUsed(accessUseParams, function(err, keyDetail) {
                            if (err) {
                                console.log(err)
                            } else {
                                console.log(keyDetail)

                                userLastUsedTimestamp = new Date(keyDetail.AccessKeyLastUsed.LastUsedDate)

                                cutoffDate = new Date(new Date().setDate(new Date().getDate()-180))
                                
                                if (userLastUsedTimestamp < cutoffDate) {
                                    console.log("Access key to delete: " + key.UserName)
                                }

                            }
                        })
                    })
                }
            })
        }

        })
    }
})