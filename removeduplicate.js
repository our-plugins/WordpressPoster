const axios = require('axios');

// WordPress Configuration - use your actual credentials
const WORDPRESS_URL = 'https://uprecipes.blog/wp-json';
const USERNAME = 'Emma Harlow';
const PASSWORD = 'jtrD lQPs eqsF xNeO tcun G4bq';
const UNCATEGORIZED_CATEGORY_ID = 1; // Typically 1 in WordPress

// Stats tracking
let stats = {
  totalPosts: 0,
  duplicatesFound: 0,
  postsDeleted: 0,
  errors: 0
};

// Create API client with authentication
const wpApi = axios.create({
  baseURL: WORDPRESS_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
  }
});

// Function to get all uncategorized posts
async function getAllUncategorizedPosts() {
  console.log('📂 Fetching all Uncategorized posts...');
  
  let allPosts = [];
  let page = 1;
  let hasMorePages = true;
  
  while (hasMorePages) {
    try {
      const response = await wpApi.get('/wp/v2/posts', {
        params: {
          categories: UNCATEGORIZED_CATEGORY_ID,
          per_page: 100,
          page: page
        }
      });
      
      if (response.data.length === 0) {
        hasMorePages = false;
      } else {
        allPosts = [...allPosts, ...response.data];
        console.log(`✅ Fetched page ${page}: ${response.data.length} posts`);
        page++;
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        hasMorePages = false; // No more pages
      } else {
        console.error('❌ Error fetching posts:', error.message);
        hasMorePages = false;
      }
    }
  }
  
  console.log(`📊 Total uncategorized posts: ${allPosts.length}`);
  stats.totalPosts = allPosts.length;
  return allPosts;
}

// Function to find duplicates by title
function findDuplicates(posts) {
  console.log('🔍 Analyzing posts for duplicates...');
  
  // Group posts by normalized title
  const postsByTitle = {};
  
  posts.forEach(post => {
    const normalizedTitle = post.title.rendered
      .toLowerCase()
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '');
    
    if (!postsByTitle[normalizedTitle]) {
      postsByTitle[normalizedTitle] = [];
    }
    
    postsByTitle[normalizedTitle].push({
      id: post.id,
      date: new Date(post.date),
      title: post.title.rendered,
      link: post.link
    });
  });
  
  // Find titles with more than one post
  const duplicates = Object.entries(postsByTitle)
    .filter(([title, posts]) => posts.length > 1)
    .map(([title, posts]) => {
      // Sort by date descending (newest first)
      posts.sort((a, b) => b.date - a.date);
      
      // The first post is the one to keep, the rest are duplicates to delete
      const [keep, ...duplicatesToRemove] = posts;
      
      return {
        title: title,
        keep: keep,
        remove: duplicatesToRemove
      };
    });
  
  console.log(`🔄 Found ${duplicates.length} titles with duplicates (${duplicates.reduce((sum, d) => sum + d.remove.length, 0)} posts to remove)`);
  stats.duplicatesFound = duplicates.reduce((sum, d) => sum + d.remove.length, 0);
  
  return duplicates;
}

// Function to delete a post
async function deletePost(postId) {
  try {
    await wpApi.delete(`/wp/v2/posts/${postId}`, {
      params: {
        force: true // Permanently delete instead of moving to trash
      }
    });
    stats.postsDeleted++;
    return true;
  } catch (error) {
    console.error(`❌ Error deleting post ${postId}: ${error.message}`);
    stats.errors++;
    return false;
  }
}

// Main function to remove duplicates
async function removeDuplicates() {
  try {
    console.log('🚀 Starting duplicate removal process...');
    
    // Get all uncategorized posts
    const posts = await getAllUncategorizedPosts();
    
    // Find duplicates
    const duplicates = findDuplicates(posts);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found! All posts are unique.');
      return;
    }
    
    // Confirm before deleting
    console.log('\n⚠️ Duplicate removal plan:');
    duplicates.forEach((dup, index) => {
      console.log(`\n${index + 1}. Title: "${dup.title}"`);
      console.log(`   ✓ Keeping: ID ${dup.keep.id} (${dup.keep.date.toISOString()})`);
      dup.remove.forEach(post => {
        console.log(`   ✗ Removing: ID ${post.id} (${post.date.toISOString()})`);
      });
    });
    
    // Ask for confirmation in real usage, removed for this script
    console.log('\n🗑️ Starting deletion of duplicate posts...');
    
    // Delete duplicates
    let deleted = 0;
    for (const dup of duplicates) {
      for (const post of dup.remove) {
        console.log(`🗑️ Deleting duplicate post ID ${post.id}: "${dup.title.substring(0, 40)}..."`);
        const success = await deletePost(post.id);
        if (success) deleted++;
        // Wait a short time between deletions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Report results
    console.log(`\n✅ Deletion complete! Removed ${deleted} duplicate posts.`);
    console.log(`\n📊 FINAL STATISTICS:`);
    console.log(`├── Total Posts Scanned: ${stats.totalPosts}`);
    console.log(`├── Duplicates Found: ${stats.duplicatesFound}`);
    console.log(`├── Posts Successfully Deleted: ${stats.postsDeleted}`);
    console.log(`└── Errors Encountered: ${stats.errors}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

// Run the script
removeDuplicates();