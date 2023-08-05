import {
  AuthorizeResult,
  PolicyDecision,
  isResourcePermission
} from '@backstage/plugin-permission-common';
import { PolicyQuery } from '@backstage/plugin-permission-node';
import { OpaClient } from '../opa-client/opaClient';
import { BackstageIdentityResponse } from '@backstage/plugin-auth-node';
import {
  catalogConditions
} from '@backstage/plugin-catalog-backend/alpha';
import { PolicyEvaluationInput, PolicyEvaluationResult } from '../../types';


export const createOpaPermissionEvaluator = (opaClient: OpaClient) => {
  return async (
    request: PolicyQuery,
    user?: BackstageIdentityResponse,
  ): Promise<PolicyDecision> => {
    const resourceType = isResourcePermission(request.permission)
      ? request.permission.resourceType
      : undefined;
    const userGroups = user?.identity.ownershipEntityRefs ?? [];
    const userName = user?.identity.userEntityRef;
    const {
      type,
      name,
      attributes: { action },
    } = request.permission;

    const input: PolicyEvaluationInput = {
      input: {
        permission: {
          type,
          name,
          action,
          resourceType,
        },
        identity: {
          username: userName,
          groups: userGroups,
        },
      },
    };

    // For debugging purposes
    console.log('input', JSON.stringify(input, null, 2));

    const response: PolicyEvaluationResult = await opaClient.evaluatePolicy(input);

    // If 'deny' is true (which means the operation is denied), we switch to a conditional decision.
    // Otherwise, it defaults to 'ALLOW'
    if (!response.deny) {
      return {
        result: AuthorizeResult.CONDITIONAL,
        conditions: {
          anyOf: [
            catalogConditions.isEntityKind({kinds: ['Component']}),
          ]
        },
        pluginId: 'catalog',
        resourceType: 'catalog-entity',
    
      };
    } 
      return { result: AuthorizeResult.DENY };
  };
};



