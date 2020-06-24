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

// ================================================================== //
// ====================== User Deletion ============================= //
// ================================================================== //
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
                                console.log(err.toString().substring(0, 20));
                            } else {
                                console.log("===========================================================");
                                console.log("Inline policies for: " + user.UserName);
                                console.log(userPolicy.PolicyNames);
                                console.log("===========================================================\n");

                                if (userPolicy.PolicyNames.length > 0) {
                                    let userInlinePolicies = userPolicy.PolicyNames;

                                    userInlinePolicies.forEach(function(inline) {
                                        let inlineParams = {
                                            UserName: user.UserName,
                                            PolicyName: inline
                                        }

                                        iam.deleteUserPolicy(inlineParams, function(err, inlineDelete) {
                                            if (err) {
                                                console.log("===========================================================")
                                                console.log(err);
                                                console.log("===========================================================\n");
                                            } else {
                                                console.log("===========================================================")
                                                console.log("Deleted user policy named: " + inline + ". For user: " + user.UserName);
                                                console.log(inlineDelete)
                                                console.log("===========================================================\n");
                                            }
                                        })
                                    })
                                }
                            }
                        });
                        
                        iam.listAttachedUserPolicies(userPolicyParams, function(err, attached) {
                            if (err) {
                                console.log(err);
                            } else {
                                if (attached.AttachedPolicies.length > 0) {
                                    console.log("===========================================================")
                                    console.log("Managed Policies for: " + user.UserName);
                                    console.log(attached.AttachedPolicies);
                                    console.log("===========================================================\n");

                                    let managedPolicies = attached.AttachedPolicies;

                                    managedPolicies.forEach(function(policy) {

                                        let managedParams = {
                                            UserName: user.UserName,
                                            PolicyArn: policy.PolicyArn
                                        }
                                        iam.detachUserPolicy(managedParams, function(err, detached) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log("===========================================================")
                                                console.log("Detached managed policy for: " + user.UserName)
                                                console.log(detached.ResponseMetadata);
                                                console.log("===========================================================\n");
                                            }
                                        })
                                    })
                                }
                            }
                        })

                        // TODO: DETACH USER POLICIES IF THEY EXIST

                        // Reusing the Access Key Params for DRYness
                        iam.listGroupsForUser(accessKeyParams, function(err, userGroups) {
                            if (err) {
                                console.log(err.toString().substring(0, 100))
                            } else {
                                console.log("===========================================================");
                                console.log("User groups for: " + user.UserName);
                                console.log(userGroups.Groups);
                                console.log("===========================================================\n");
                                if (userGroups.Groups.length > 0) {

                                    let groups = userGroups.Groups;

                                    groups.forEach(function(group) {

                                        let groupRemoveParams = {
                                            GroupName: group.GroupName,
                                            UserName: user.UserName
                                        }

                                        iam.removeUserFromGroup(groupRemoveParams, function(err, removedGroup) {
                                            if (err) {
                                                console.log("===========================================================");
                                                console.log(err);
                                                console.log("===========================================================\n");
                                            } else {
                                                console.log("===========================================================");
                                                console.log("Removed user: " + user.UserName + " from user group.")
                                                console.log(removedGroup.ResponseMetadata);
                                                console.log("===========================================================\n");
                                            }
                                        })
                                    })
                                }
                            }
                        });

                        // GET: Login Profile
                        let loginProfileParams = {
                            UserName: user.UserName
                        }

                        iam.getLoginProfile(loginProfileParams, function(err, foundProfile) {
                            if (err) {
                                console.log("===========================================================");
                                console.log("No login profile for: " + user.UserName);
                                console.log("===========================================================\n");
                            } else {
                                console.log("===========================================================");
                                console.log("Found a login profile for: " + user.UserName);
                                console.log(foundProfile.LoginProfile);
                                console.log("===========================================================\n");

                                let deleteProfileParams = {
                                    UserName: user.UserName
                                }
        
                                iam.deleteLoginProfile(deleteProfileParams, function(err, deletedProfile) {
                                    if (err) {
                                        console.log("DELETE PROFILE ERROR FOR USER: " + user.UserName);
                                        console.log(err);
                                    } else {
                                        console.log("===========================================================")
                                        console.log(user.UserName + " has not been active in 180 days & their login profile has been deleted.");
                                        console.log(deletedProfile.ResponseMetadata);
                                        console.log("===========================================================\n")
                                    }
                                });
                            }
                        })


                        let deleteUserParams = {
                            UserName: user.UserName
                        }

                        iam.deleteUser(deleteUserParams, function(err, deletedUser) {
                            if (err) {
                                console.log("===========================================================");
                                console.log("DELETE USER ERROR FOR: " + user.UserName);
                                console.log(err);
                                console.log("===========================================================\n");
                            } else {
                                console.log("===========================================================")
                                console.log(user.UserName + " has not been active in 180 days & has been deleted.");
                                console.log(deletedUser.ResponseMetadata);
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
                                                console.log(deletedKey.ResponseMetadata);
                                                console.log("===========================================================\n");
                                            }
                                        });
    
                                        let userPolicyParams = {
                                            UserName: user.UserName
                                        }
                
                                        iam.listUserPolicies(userPolicyParams, function(err, userPolicy) {
                                            if (err) {
                                                console.log(err.toString().substring(0, 100));
                                            } else {
                                                console.log("===========================================================");
                                                console.log("Inline policies for: " + user.UserName);
                                                console.log(userPolicy.PolicyNames);
                                                console.log("===========================================================\n");
                
                                                if (userPolicy.PolicyNames.length > 0) {
                                                    let userInlinePolicies = userPolicy.PolicyNames;
                
                                                    userInlinePolicies.forEach(function(inline) {
                                                        let inlineParams = {
                                                            UserName: user.UserName,
                                                            PolicyName: inline
                                                        }
                
                                                        iam.deleteUserPolicy(inlineParams, function(err, inlineDelete) {
                                                            if (err) {
                                                                console.log("===========================================================")
                                                                console.log(err);
                                                                console.log("===========================================================\n");
                                                            } else {
                                                                console.log("===========================================================")
                                                                console.log("Deleted user policy named: " + inline + ". For user: " + user.UserName);
                                                                console.log(inlineDelete)
                                                                console.log("===========================================================\n");
                                                            }
                                                        })
                                                    })
                                                }
                                            }
                                        });
                                        
                                        iam.listAttachedUserPolicies(userPolicyParams, function(err, attached) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                if (attached.AttachedPolicies.length > 0) {
                                                    console.log("===========================================================")
                                                    console.log("Managed Policies for: " + user.UserName);
                                                    console.log(attached.AttachedPolicies);
                                                    console.log("===========================================================\n");
                
                                                    let managedPolicies = attached.AttachedPolicies;
                
                                                    managedPolicies.forEach(function(policy) {
                
                                                        let managedParams = {
                                                            UserName: user.UserName,
                                                            PolicyArn: policy.PolicyArn
                                                        }
                                                        iam.detachUserPolicy(managedParams, function(err, detached) {
                                                            if (err) {
                                                                console.log(err);
                                                            } else {
                                                                console.log("===========================================================")
                                                                console.log("Detached managed policy for: " + user.UserName)
                                                                console.log(detached.ResponseMetadata);
                                                                console.log("===========================================================\n");
                                                            }
                                                        })
                                                    })
                                                }
                                            }
                                        })
                
                
                                        // Reusing the Access Key Params for DRYness
                                        iam.listGroupsForUser(accessKeyParams, function(err, userGroups) {
                                            if (err) {
                                                console.log(err.toString().substring(0, 100))
                                            } else {
                                                console.log("===========================================================");
                                                console.log("User groups for: " + user.UserName);
                                                console.log(userGroups.Groups);
                                                console.log("===========================================================\n");
                                                if (userGroups.Groups.length > 0) {
                
                                                    let groups = userGroups.Groups;
                
                                                    groups.forEach(function(group) {
                
                                                        let groupRemoveParams = {
                                                            GroupName: group.GroupName,
                                                            UserName: user.UserName
                                                        }
                
                                                        iam.removeUserFromGroup(groupRemoveParams, function(err, removedGroup) {
                                                            if (err) {
                                                                console.log("===========================================================");
                                                                console.log(err);
                                                                console.log("===========================================================\n");
                                                            } else {
                                                                console.log("===========================================================");
                                                                console.log("Removed user: " + user.UserName + " from user group.")
                                                                console.log(removedGroup.ResponseMetadata);
                                                                console.log("===========================================================\n");
                                                            }
                                                        })
                                                    })
                                                }
                                            }
                                        });
                
                                        // GET: Login Profile
                                        let loginProfileParams = {
                                            UserName: user.UserName
                                        }
                
                                        iam.getLoginProfile(loginProfileParams, function(err, foundProfile) {
                                            if (err) {
                                                console.log("===========================================================");
                                                console.log("No login profile for: " + user.UserName);
                                                console.log("===========================================================\n");
                                            } else {
                                                console.log("===========================================================");
                                                console.log("Found a login profile for: " + user.UserName);
                                                console.log(foundProfile.LoginProfile);
                                                console.log("===========================================================\n");
                
                                                let deleteProfileParams = {
                                                    UserName: user.UserName
                                                }
                        
                                                iam.deleteLoginProfile(deleteProfileParams, function(err, deletedProfile) {
                                                    if (err) {
                                                        console.log("DELETE PROFILE ERROR FOR USER: " + user.UserName);
                                                        console.log(err);
                                                    } else {
                                                        console.log("===========================================================")
                                                        console.log(user.UserName + " has not been active in 180 days & their login profile has been deleted.");
                                                        console.log(deletedProfile.ResponseMetadata);
                                                        console.log("===========================================================\n")
                                                    }
                                                });
                                            }
                                        })
                
                
                                        let deleteUserParams = {
                                            UserName: user.UserName
                                        }
                
                                        iam.deleteUser(deleteUserParams, function(err, deletedUser) {
                                            if (err) {
                                                console.log("===========================================================");
                                                console.log("DELETE USER ERROR FOR: " + user.UserName);
                                                console.log(err);
                                                console.log("===========================================================\n");
                                            } else {
                                                console.log("===========================================================")
                                                console.log(user.UserName + " has not been active in 180 days & has been deleted.");
                                                console.log(deletedUser.ResponseMetadata);
                                                console.log("===========================================================\n")
                                            }
                                        });

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
            // TODO - ADD DELETION LOGIC FOR USERS WITH CONSOLE PASSWORDS
            console.log("===========================================================");
            console.log("Password for user: " + user.UserName + " Last Used: " + user.PasswordLastUsed)
            console.log("===========================================================\n");
            // iam.listAccessKeys(accessKeyParams, function(err, accessDetail) {
            //     if (err) {
            //         console.log(err);
            //     } else {

            //         let accessKeys = accessDetail.AccessKeyMetadata
                    
            //         accessKeys.forEach(function(key) {

            //             let accessUseParams = {
            //                 AccessKeyId: key.AccessKeyId
            //             }

            //             iam.getAccessKeyLastUsed(accessUseParams, function(err, keyDetail) {
            //                 if (err) {
            //                     console.log(err)
            //                 } else {
            //                     console.log(keyDetail)

            //                     userLastUsedTimestamp = new Date(keyDetail.AccessKeyLastUsed.LastUsedDate)

            //                     cutoffDate = new Date(new Date().setDate(new Date().getDate()-180))
                                
            //                     if (userLastUsedTimestamp < cutoffDate) {
            //                         console.log("Access key to delete: " + key.UserName)
            //                     }

            //                 }
            //             })
            //         })
            //     }
            // })
        }

        })
    }
})