const axios = require('axios');

// WordPress Configuration (using your existing settings)
const WORDPRESS_URL = 'https://uprecipes.blog/wp-json';
const USERNAME = 'Emma Harlow';
const PASSWORD = 'jtrD lQPs eqsF xNeO tcun G4bq';

// Statistics
let stats = {
  totalPosts: 0,
  postsWithoutImages: 0,
  postsDeleted: 0,
  deletionFailed: 0
};

// Create WordPress API client
const wpApi = axios.create({
  baseURL: WORDPRESS_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
  }
});

// Function to fetch all posts (paginated)
async function getAllPosts() {
  let allPosts = [];
  let page = 1;
  const perPage = 100; // Maximum allowed by WordPress
  let hasMorePosts = true;

  console.log('📚 Fetching posts...');
  
  while (hasMorePosts) {
    try {
      const response = await wpApi.get('/wp/v2/posts', {
        params: {
          page,
          per_page: perPage,
          _fields: 'id,title,featured_media' // Only request fields we need
        }
      });
      
      const posts = response.data;
      allPosts = [...allPosts, ...posts];
      
      console.log(`✅ Fetched page ${page} (${posts.length} posts)`);
      
      if (posts.length < perPage) {
        hasMorePosts = false;
      } else {
        page++;
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        // This usually means we've reached the end of available pages
        hasMorePosts = false;
      } else {
        console.error('❌ Error fetching posts:', error.message);
        hasMorePosts = false;
      }
    }
  }

  return allPosts;
}

// Function to delete a post
async function deletePost(postId, title) {
  try {
    await wpApi.delete(`/wp/v2/posts/${postId}`, {
      params: {
        force: true // Permanently delete instead of moving to trash
      }
    });
    stats.postsDeleted++;
    console.log(`🗑️ Deleted post: "${title}" (ID: ${postId})`);
    return true;
  } catch (error) {
    stats.deletionFailed++;
    console.error(`❌ Failed to delete post ID ${postId}:`, error.message);
    return false;
  }
}

// Function to display statistics
function logStats() {
  console.log(`\n📊 STATISTICS:`);
  console.log(`├── Total Posts Scanned: ${stats.totalPosts}`);
  console.log(`├── Posts Without Images: ${stats.postsWithoutImages}`);
  console.log(`├── Posts Deleted: ${stats.postsDeleted}`);
  console.log(`└── Deletion Failed: ${stats.deletionFailed}`);
}

// Main function
async function removePostsWithoutFeaturedImages() {
  try {
    console.log('🚀 Starting removal of posts without featured images...');
    
    // Get all posts
    const allPosts = await getAllPosts();
    stats.totalPosts = allPosts.length;
    console.log(`📁 Found ${stats.totalPosts} total posts`);
    
    // Filter posts without featured media
    const postsWithoutImages = allPosts.filter(post => !post.featured_media || post.featured_media === 0);
    stats.postsWithoutImages = postsWithoutImages.length;
    
    console.log(`🔍 Found ${stats.postsWithoutImages} posts without featured images`);
    
    if (postsWithoutImages.length === 0) {
      console.log('✨ No posts to delete. All posts have featured images!');
      return;
    }
    
    // Ask for confirmation before deleting
    console.log('\n⚠️ WARNING: This will permanently delete the following posts:');
    postsWithoutImages.forEach((post, index) => {
      console.log(`${index + 1}. "${post.title.rendered}" (ID: ${post.id})`);
    });
    
    console.log('\n⚠️ To proceed with deletion, uncomment the deletion code in the script.');
    
    // SAFETY FEATURE: This deletion code is commented out by default
    // Uncomment the following code block when you're ready to delete the posts
    /*
    console.log('\n🔄 Deleting posts...');
    for (const post of postsWithoutImages) {
      await deletePost(post.id, post.title.rendered);
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    */
    
    console.log('\n✅ Process completed!');
    logStats();
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

// Run the script
removePostsWithoutFeaturedImages();