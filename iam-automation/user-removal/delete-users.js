// ================================================================== //
// ====================== Library Requirement ======================= //
// ================================================================== //
// Require AWS SDK library 
let AWS = require("aws-sdk");
let iam = new AWS.IAM({apiVersion: '2010-05-08'});

// ================================================================== //
// ====================== Process User Input ======================== //
// ================================================================== //
// User input determines the amount of roles to list & delete if they fit the criteria
// Process.Argv array contains information about the execution and input is stored in 3rd index of array
let items = process.argv[2];

// Filtering parameter for the List Users AWS API call
// User determines the max amount of items (in this case, users) to search and return
let params = {
    MaxItems: items
}

// ================================================================== //
// ====================== User Deletion ============================= //
// ================================================================== //
// GET - List of all users in account
let users = iam.listUsers(params, function(err, foundUsers) {

    // Output error message if necessary
    if (err) {
        console.log(err);
    } else {

        // Create users array variable containing user objects for all in AWS account
        // Returns: Path, Username, UserId, Arn, Created Date, & Tags
        let users = foundUsers.Users;

        // Iterate over users array 
        users.forEach(function(user) {
            
        // If a user has never logged into the console, they will not have a "PasswordLastUsed" value in their user object
        // Output username to console if no password exists
        if (user.PasswordLastUsed == undefined) {
            console.log("===========================================================")
            console.log("No Console Password for: " + user.UserName)
            console.log("===========================================================\n")

            // Required parameters for ListAccessKeys AWS API call
            let accessKeyParams = {
                UserName: user.UserName
            }
            
            // List Access Keys API call
            iam.listAccessKeys(accessKeyParams, function(err, accessDetail) {
                if (err) {
                    console.log(err);
                } else {
                    
                    // Callback returns object for requested user with: Response Metadata & Access Key Metadata array of access key objects
                    // Access Key Metadata inclues: Username, Access Key ID, Status (active or not), and Create Date
                    // If that access key metadata is blank, no key exists for the user
                    if (accessDetail.AccessKeyMetadata.length < 1) {
                        console.log("===========================================================")
                        console.log("No access key for: " + user.UserName +". Moving to delete.");
                        console.log("===========================================================\n");
                        
                        // Required params for ListUserPolicies AWS API Call
                        let userPolicyParams = {
                            UserName: user.UserName
                        }

                        // List User Policies API call
                        iam.listUserPolicies(userPolicyParams, function(err, userPolicy) {
                            if (err) {
                                console.log(err.toString().substring(0, 20));
                            } else {

                                // List any associated inline policies attached to the current user from the users array
                                // No inline policies attached to the user will return an empty [] array response
                                console.log("===========================================================");
                                console.log("Inline policies for: " + user.UserName);
                                console.log(userPolicy.PolicyNames);
                                console.log("===========================================================\n");

                                // PolicyNames array will contain any associated inline policies
                                // If none are attached, array will be empty and therefore the length will be 0
                                if (userPolicy.PolicyNames.length > 0) {

                                    // Create array variable containing the policy objects for each attached policy
                                    let userInlinePolicies = userPolicy.PolicyNames;

                                    // Iterate over each inline policy for the specific user
                                    userInlinePolicies.forEach(function(inline) {

                                        // Required parameters for Delete User Policy API call
                                        let inlineParams = {
                                            UserName: user.UserName,
                                            PolicyName: inline
                                        }

                                        // Delete User Policy API call
                                        iam.deleteUserPolicy(inlineParams, function(err, inlineDelete) {
                                            if (err) {
                                                console.log("===========================================================")
                                                console.log(err);
                                                console.log("===========================================================\n");
                                            } else {

                                                // Output details on deleted policy and the associated user
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
                        
                        // List Attached User Policies API call
                        // This call lists the Managed policies attached to the user, as opposed to the inline policies
                        iam.listAttachedUserPolicies(userPolicyParams, function(err, attached) {
                            if (err) {
                                console.log(err);
                            } else {

                                // Same logic as with Inline Policies, if the result contains attached policies the AttachedPolicies array length will be > 0
                                if (attached.AttachedPolicies.length > 0) {
                                    console.log("===========================================================")
                                    console.log("Managed Policies for: " + user.UserName);
                                    console.log(attached.AttachedPolicies);
                                    console.log("===========================================================\n");

                                    // Created array variable inclusive of all attached policy objects
                                    let managedPolicies = attached.AttachedPolicies;

                                    // Iterate over the array 
                                    managedPolicies.forEach(function(policy) {

                                        // Required parameters for Detach User Policy API call
                                        let managedParams = {
                                            UserName: user.UserName,
                                            PolicyArn: policy.PolicyArn
                                        }
                                        
                                        // Detach User Policy API call
                                        iam.detachUserPolicy(managedParams, function(err, detached) {
                                            if (err) {
                                                console.log(err);
                                            } else {

                                                // Log details about managed policies that were detached from the user
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

                        
                        // List Groups For User API call
                        // Reusing the Access Key Params for DRYness
                        iam.listGroupsForUser(accessKeyParams, function(err, userGroups) {
                            if (err) {
                                console.log(err.toString().substring(0, 100))
                            } else {

                                // Output groups the user is associated with
                                console.log("===========================================================");
                                console.log("User groups for: " + user.UserName);
                                console.log(userGroups.Groups);
                                console.log("===========================================================\n");

                                // If the user is in any groups, the Groups array in the userGroups callback will have a length > 0
                                if (userGroups.Groups.length > 0) {

                                    // Create array variable inclusive of all user groups
                                    let groups = userGroups.Groups;

                                    // Iterate over groups array
                                    groups.forEach(function(group) {

                                        // Required parameters for Remove User From Group API call
                                        let groupRemoveParams = {
                                            GroupName: group.GroupName,
                                            UserName: user.UserName
                                        }

                                        // Remove User From Group API Call
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

                        // GET: Login Profile, if exists
                        // Required parameters for Get Login Profile API call
                        let loginProfileParams = {
                            UserName: user.UserName
                        }

                        // Get Login Profile API call
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

                                // If the user has a login profile, move to delete 
                                // Required parameters for Delete Login Profile API call
                                let deleteProfileParams = {
                                    UserName: user.UserName
                                }
                                
                                // Delete Login Profile API call
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

                        // Delete user once all the pre-reqs have been satisfied for user deletion 
                        // (detach/delete polices, remove from groups/login profiles)
                        let deleteUserParams = {
                            UserName: user.UserName
                        }

                        // Delete User API Call
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

                        // Still in List User Access Keys API call, this block executes if user has access keys in use
                        // Create array of access keys, since users can have multiple associated with them
                        let accessKeys = accessDetail.AccessKeyMetadata
                        
                        // Iterate over access keys in the array
                        accessKeys.forEach(function(key) {
                            
                            // Required parameters for Get Access Key Last Used API call
                            let accessUseParams = {
                                AccessKeyId: key.AccessKeyId
                            }
                            
                            // Get Access Key Last Used API call
                            iam.getAccessKeyLastUsed(accessUseParams, function(err, keyDetail) {
                                if (err) {
                                    console.log("===========================================================");
                                    console.log(err);
                                    console.log("===========================================================\n");
                                } else {
                                    
                                    // Variable to hold value of the date timestamp the access key was last used
                                    userLastUsedTimestamp = new Date(keyDetail.AccessKeyLastUsed.LastUsedDate)
                                    
                                    // Cuttoff date variable defines the timeframe for which keys should be deleted
                                    // As currently defined, all keys not used in the last 180 days will be removed
                                    cutoffDate = new Date(new Date().setDate(new Date().getDate()-180))
                                    
                                    // Compare the cutoff date to the date the key was last used
                                    // If either of those qualifiers hit, the key will be deleted
                                    if (userLastUsedTimestamp < cutoffDate || keyDetail.AccessKeyLastUsed.LastUsedDate == undefined) {
                                        console.log("===========================================================")
                                        console.log("Access key to delete: " + key.UserName)
                                        console.log("===========================================================\n")
                                        
                                        // Required parameters for Delete Access Key API call
                                        let deleteParams = {
                                            AccessKeyId: key.AccessKeyId,
                                            UserName: user.UserName
                                        }
                                        
                                        // Delete Access Key API call
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
                                        
                                        // The remaining portion of this block of code in the else statement is the same as above
                                        // Inline comments can be found in the if block
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