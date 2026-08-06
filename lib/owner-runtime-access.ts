export type OwnerRuntimeResource = {
  user_id: string | null | undefined;
};

export function isOwnerRuntimeActor<T extends OwnerRuntimeResource>(
  actorUserId: string | null | undefined,
  resource: T | null | undefined,
): resource is T {
  return Boolean(actorUserId && resource?.user_id && actorUserId === resource.user_id);
}
