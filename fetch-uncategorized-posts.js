const axios = require('axios');

// WordPress Configuration (using your existing settings)
const WORDPRESS_URL = 'https://uprecipes.blog/wp-json';
const USERNAME = 'Emma Harlow';
const PASSWORD = 'jtrD lQPs eqsF xNeO tcun G4bq';
const UNCATEGORIZED_CATEGORY_ID = 1;  // Default ID for Uncategorized
const POSTS_TO_FETCH = 30;

// Create WordPress API client
const wpApi = axios.create({
  baseURL: WORDPRESS_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
  }
});

// Function to get image URL from media ID
async function getImageUrl(mediaId) {
  try {
    if (!mediaId) return null;
    
    const response = await wpApi.get(`/wp/v2/media/${mediaId}`);
    return response.data.source_url;
  } catch (error) {
    console.error(`❌ Error fetching image (ID: ${mediaId}):`, error.message);
    return null;
  }
}

// Function to get latest uncategorized posts
async function getLatestUncategorizedPosts() {
  try {
    console.log(`🔍 Fetching latest ${POSTS_TO_FETCH} posts from Uncategorized category...`);
    
    const response = await wpApi.get('/wp/v2/posts', {
      params: {
        categories: UNCATEGORIZED_CATEGORY_ID,
        per_page: POSTS_TO_FETCH,
        orderby: 'date',
        order: 'desc',
        _fields: 'id,title,featured_media,link'  // Only request fields we need
      }
    });
    
    const posts = response.data;
    console.log(`✅ Found ${posts.length} posts`);
    
    const results = [];
    
    // Process each post to get its image URL
    for (const post of posts) {
      const imageUrl = await getImageUrl(post.featured_media);
      
      results.push({
        id: post.id,
        title: post.title.rendered,
        featured_image: imageUrl,
        link: post.link
      });
      
      console.log(`📄 Processed post: "${post.title.rendered}"`);
    }
    
    // Output results in formatted way
    console.log('\n📋 RESULTS:');
    console.log('='.repeat(80));
    
    results.forEach((post, index) => {
      console.log(`[${index + 1}] Post ID: ${post.id}`);
      console.log(`    Title: ${post.title}`);
      console.log(`    Image: ${post.featured_image || 'No featured image'}`);
      console.log(`    Link: ${post.link}`);
      console.log('-'.repeat(80));
    });
    
    // Save results to JSON file
    const fs = require('fs');
    fs.writeFileSync('uncategorized_posts.json', JSON.stringify(results, null, 2));
    console.log('💾 Results saved to uncategorized_posts.json');
    
    return results;
  } catch (error) {
    console.error('❌ Error fetching posts:', error.response?.data || error.message);
    return [];
  }
}

// Run the script
getLatestUncategorizedPosts();
