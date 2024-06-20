import { Bytes } from "@graphprotocol/graph-ts";
import {
  PostCreated as PostCreatedEvent
} from "../generated/LensProxy/LensProxy"
import { PostCreated } from "../generated/schema"

export function handlePostCreated(event: PostCreatedEvent): void {
  let entity = new PostCreated(
    Bytes.fromUTF8(
      event.params.profileId.toString() + "-" + event.params.pubId.toString(),
    ),
  );

  entity.contentURI = event.params.contentURI;

  entity.ownerId = event.params.profileId;
  entity.timestamp = event.params.timestamp;

  entity.save();
}
