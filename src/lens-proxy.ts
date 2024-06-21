import { Bytes, dataSource, DataSourceContext, DataSourceTemplate } from "@graphprotocol/graph-ts";
import {
  PostCreated as PostCreatedEvent
} from "../generated/LensProxy/LensProxy"
import { PostCreated, PostContent } from "../generated/schema"

// POST_ID_KEY will be used as the key for a key-value pair passed into the
// `context` argument in the createWithContext(name: string, params: string[], context: DataSourceContext)
const POST_ID_KEY = "postID";

export function handlePostCreated(event: PostCreatedEvent): void {
  let entity = new PostCreated(
    Bytes.fromUTF8(
      event.params.profileId.toString() +
      "-" +
      event.params.pubId.toString()
    )
  );

  entity.ownerId = event.params.profileId;
  entity.contentURI = event.params.contentURI;
  entity.timestamp = event.params.timestamp;

  entity.save();

  // EXTRACT THE ID FROM OUR ENTITY
  // Find the index of where "arweave.net" or "/ipfs/" is within the contentURI.
  // This is a relatively naive way of finding whether the content is from
  // Arweave or IPFS. Feel free to extend this further to capture all the various
  // ways that IDs present in the Arweave and IPFS URIs.
  let arweaveIndex = entity.contentURI.indexOf("arweave.net/");
  let ipfsIndex = entity.contentURI.indexOf("/ipfs/");

  // If both arweave and ipfsIndex return -1, which means the strings were not found.
  // At that point, there's nothing else to do, so the function ends.
  if (arweaveIndex == -1 && ipfsIndex == -1) return;

  // PREPARE `CONTEXT` - PASS IN OUR ID
  // DataSourceContext() is passed in a key,value pair that is converted into Bytes
  // to be passed into other handlers. The key was defined outside this function as
  // POST_ID_KEY and the value is the entity.id. This allows consistency between
  // handlers as the data is being indexed.
  let context = new DataSourceContext();
  context.setBytes(POST_ID_KEY, entity.id);

  // If Arweave data or IPFS data is found in the URI, the data hash is extracted
  // from contentURI. We now have the three variables we need! Pass them into
  // .createWithContext() to trigger File Data Sources indexing!
  if (arweaveIndex != -1) {
    let hash = entity.contentURI.substr(arweaveIndex + 12);
    DataSourceTemplate.createWithContext("ArweaveContent", [hash], context);

    return;
  }

  if (ipfsIndex != -1) {
    let hash = entity.contentURI.substr(ipfsIndex + 6);
    DataSourceTemplate.createWithContext("IpfsContent", [hash], context);
  }
}

export function handlePostContent(content: Bytes): void {
  // Remember DataSourceTemplate.createWithContext()? We can access
  // everything we just passed into that method here!
  // Gather the `hash` aka the ID with dataSource.stringParam()
  // Gather the `context` that has our ID encoded as Bytes as dataSource.context(),
  // then decode it.
  let hash = dataSource.stringParam();
  let context = dataSource.context();
  let id = context.getBytes(POST_ID_KEY);

  // We pass in the same ID used in the previous `PostCreated` handler here to
  // link the on-chain PostCreated ID with the off-chain PostContent id.
  let post = new PostContent(id);

  post.hash = hash;
  post.content = content.toString();

  post.save();
}