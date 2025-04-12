const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// WordPress Configuration
const WORDPRESS_URL = 'https://uprecipes.blog/wp-json';
const USERNAME = 'Emma Harlow';
const PASSWORD = 'jtrD lQPs eqsF xNeO tcun G4bq';
const MIN_DESCRIPTION_LENGTH = 200;
const JSON_FILE_PATH = './hlRecipesPosts.json';
// Category configuration - Uncategorized category ID (typically 1 in WordPress)
const UNCATEGORIZED_CATEGORY_ID = 1;

// AdSense Code
const ADSENSE_BLOCK = `<!-- wp:html -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5509961066897132"
     crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block; text-align:center;"
     data-ad-layout="in-article"
     data-ad-format="fluid"
     data-ad-client="ca-pub-5509961066897132"
     data-ad-slot="2762560982"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
<!-- /wp:html -->`;

// Statistics
let stats = {
  totalPosts: 0,
  createdPosts: 0,
  skippedPosts: 0,
  failedPosts: 0,
  duplicatePosts: 0,
  imageFailedPosts: 0  // New stat for posts skipped due to image upload failure
};

const wpApi = axios.create({
  baseURL: WORDPRESS_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
  }
});

function cleanText(text) {
  if (!text) return '';
  // Remove quotes and trim whitespace
  return text.toString().replace(/^["']+|["']+$/g, '').trim();
}

function generateTitle(description, originalTitle) {
  const cleanDesc = cleanText(description);
  const cleanTitle = cleanText(originalTitle);
  
  if (!cleanDesc) return cleanTitle || 'Untitled Post';
  
  // First sentence logic
  const firstSentence = cleanDesc.match(/^.*?[.!?](?=\s|$)/)?.[0];
  if (firstSentence && firstSentence.split(/\s+/).length > 3) {
    return firstSentence;
  }
  
  // First 6 words fallback
  const words = cleanDesc.split(/\s+/).slice(0, 6);
  return words.join(' ');
}

function formatContent(content) {
  const cleanContent = cleanText(content);
  // Preserve all original line breaks
  const lines = cleanContent.split('\n').filter(line => line.trim() !== '');
  
  return lines.map(line => 
    `<!-- wp:paragraph -->
<p>${line}</p>
<!-- /wp:paragraph -->`
  ).join('\n');
}

function insertAds(content) {
  const formattedContent = formatContent(content);
  const contentBlocks = formattedContent.split(/(<!-- \/wp:paragraph -->)/g);
  
  // Insert ads at start, middle, and end
  const adPositions = [
    0,
    Math.floor(contentBlocks.length / 2),
    contentBlocks.length
  ];
  
  // Insert ads (working backwards to avoid index issues)
  const result = [...contentBlocks];
  adPositions.sort((a,b) => b-a).forEach(pos => {
    result.splice(pos, 0, ADSENSE_BLOCK);
  });
  
  return result.join('\n');
}

async function uploadImage(imageUrl, title) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    const form = new FormData();
    form.append('file', response.data, {
      filename: `${cleanText(title).replace(/\s+/g, '-').toLowerCase()}.jpg`,
      contentType: 'image/jpeg'
    });
    
    const uploadResponse = await wpApi.post('/wp/v2/media', form, {
      headers: {
        ...form.getHeaders(),
        'Content-Disposition': `attachment; filename="${cleanText(title).replace(/\s+/g, '-').toLowerCase()}.jpg"`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    return uploadResponse.data.id;
  } catch (error) {
    console.error('❌ Image upload error:', error.response?.data || error.message);
    return null;
  }
}

// New function to check if a post with the same title already exists
async function checkForDuplicate(title) {
  try {
    // Search for posts with the same title
    const searchResponse = await wpApi.get('/wp/v2/posts', {
      params: {
        search: title,
        per_page: 100
      }
    });
    
    // Check if any post has an exactly matching title (case insensitive)
    const normalizedTitle = title.toLowerCase().trim();
    const duplicatePost = searchResponse.data.find(post => 
      post.title.rendered.toLowerCase().trim() === normalizedTitle
    );
    
    return duplicatePost ? true : false;
  } catch (error) {
    console.error('❌ Error checking for duplicates:', error.response?.data || error.message);
    return false; // If there's an error, we'll assume it's not a duplicate to be safe
  }
}

// New function to get uncategorized posts
async function getUncategorizedPosts() {
  try {
    // Get posts with the Uncategorized category
    const response = await wpApi.get('/wp/v2/posts', {
      params: {
        categories: UNCATEGORIZED_CATEGORY_ID,
        per_page: 100
      }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching uncategorized posts:', error.response?.data || error.message);
    return [];
  }
}

async function createPost(postData, index) {
  try {
    const description = cleanText(postData.Description);
    if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
      console.log(`⏭ [${index+1}/${stats.totalPosts}] Skipping: Description too short`);
      stats.skippedPosts++;
      return null;
    }

    const title = generateTitle(description, postData.Title);
    
    // Check for duplicate titles before proceeding
    const isDuplicate = await checkForDuplicate(title);
    if (isDuplicate) {
      console.log(`🔄 [${index+1}/${stats.totalPosts}] Skipping: Duplicate title detected "${title}"`);
      stats.duplicatePosts++;
      return null;
    }
    
    // Check if the post has an image to upload
    if (postData.Picture) {
      const featured_media = await uploadImage(postData.Picture, title);
      if (!featured_media) {
        // Skip post creation if image upload fails
        console.log(`⚠️ [${index+1}/${stats.totalPosts}] Skipping: Featured image upload failed`);
        stats.imageFailedPosts++;
        return null;
      }
      
      // Only proceed with post creation if image was successfully uploaded
      const postContent = {
        title: title,
        content: insertAds(description),
        status: 'publish',
        featured_media: featured_media,
        categories: [UNCATEGORIZED_CATEGORY_ID]
      };
      
      const response = await wpApi.post('/wp/v2/posts', postContent);
      stats.createdPosts++;
      console.log(`✅ [${index+1}/${stats.totalPosts}] Created: "${title}"`);
      return response.data;
    } else {
      // Skip post creation if there's no image
      console.log(`⏭ [${index+1}/${stats.totalPosts}] Skipping: No featured image provided`);
      stats.skippedPosts++;
      return null;
    }
  } catch (error) {
    stats.failedPosts++;
    console.error(`❌ [${index+1}/${stats.totalPosts}] Error:`, error.response?.data || error.message);
    return null;
  } finally {
    logStats();
  }
}

function logStats() {
  console.log(`\n📊 STATISTICS:`);
  console.log(`├── Total: ${stats.totalPosts}`);
  console.log(`├── Created: ${stats.createdPosts}`);
  console.log(`├── Skipped: ${stats.skippedPosts}`);
  console.log(`├── Duplicates: ${stats.duplicatePosts}`);
  console.log(`├── Image Failed: ${stats.imageFailedPosts}`);  // Display the new stat
  console.log(`├── Failed: ${stats.failedPosts}`);
  console.log(`└── Progress: ${Math.round((stats.createdPosts + stats.skippedPosts + stats.duplicatePosts + stats.imageFailedPosts + stats.failedPosts) / stats.totalPosts * 100)}%`);
}

async function processJSON() {
  try {
    console.log('🚀 Starting post creation...');
    const rawData = fs.readFileSync(JSON_FILE_PATH);
    const posts = JSON.parse(rawData);
    stats.totalPosts = posts.length;
    
    console.log(`📁 Found ${stats.totalPosts} posts`);
    logStats();
    
    for (let i = 0; i < posts.length; i++) {
      await createPost(posts[i], i);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    }
    
    console.log('🎉 All posts processed!');
    logStats();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

processJSON();