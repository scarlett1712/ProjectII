import { badRequest } from "@/shared/application/errors";
import { isSystemTagId, SYSTEM_TAGS } from "../domain/systemTags";
import { tagRepository } from "../infrastructure/tagRepository";
import type { CreateTagInput, UpdateTagInput } from "./calendarSchemas";

/** System tags precede user-defined tags. */
export async function listTags(userId: string) {
  const userTags = await tagRepository.findAll(userId);
  return [...SYSTEM_TAGS, ...userTags];
}

export function createTag(userId: string, input: CreateTagInput) {
  return tagRepository.create(userId, input.name, input.color);
}

export async function updateTag(userId: string, input: UpdateTagInput) {
  // The client stores system tag overrides in localStorage.
  if (isSystemTagId(input.id)) throw badRequest("calendar.tag.systemTagNotEditable");
  await tagRepository.update(userId, input.id, input.name, input.color);
}

export async function deleteTag(userId: string, id: string) {
  if (isSystemTagId(id)) throw badRequest("calendar.tag.systemTagNotDeletable");
  await tagRepository.deleteById(userId, id);
}
