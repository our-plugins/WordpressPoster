const axios = require('axios');

const WORDPRESS_URL = 'https://uprecipes.blog/wp-json';
const USERNAME = 'Emma Harlow';
const PASSWORD = 'jtrD lQPs eqsF xNeO tcun G4bq';

const wpApi = axios.create({
  baseURL: WORDPRESS_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
  }
});

// Better regex for matching AdSense blocks
const adsenseBlockRegex = /<!-- wp:html -->[\s\S]*?<script[^>]*?src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*?><\/script>[\s\S]*?<!-- \/wp:html -->/gi;

const replacementBlock = `<!-- wp:html -->
<br class='adsBreak'>
<!-- /wp:html -->`;

const PER_PAGE = 10;

async function updatePostsInBatches() {
  let currentPage = 1;
  let totalUpdated = 0;
  let totalChecked = 0;

  while (true) {
    try {
      const response = await wpApi.get(`/wp/v2/posts`, {
        params: {
          per_page: PER_PAGE,
          page: currentPage,
          context: 'edit' // Important: get `raw` content!
        }
      });

      const posts = response.data;

      if (posts.length === 0) {
        console.log('✅ All posts processed.');
        break;
      }

      console.log(`\n🔄 Processing batch ${currentPage} (${posts.length} posts)...`);

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const oldContent = post.content?.raw || post.content?.rendered || '';
        totalChecked++;

        if (adsenseBlockRegex.test(oldContent)) {
          const newContent = oldContent.replace(adsenseBlockRegex, replacementBlock);

          try {
            await wpApi.post(`/wp/v2/posts/${post.id}`, {
              content: newContent
            });

            totalUpdated++;
            console.log(`✅ Updated post ${totalUpdated}/${totalChecked} - ID ${post.id}: ${post.title.rendered}`);
          } catch (updateErr) {
            console.error(`❌ Failed to update post ID ${post.id}:`, {
              message: updateErr.message,
              data: updateErr.response?.data
            });
          }
        } else {
          console.log(`➖ Skipped post ${totalChecked} - ID ${post.id} (no AdSense block)`);
        }
      }

      currentPage++;
    } catch (err) {
      console.error(`❌ Error while fetching page ${currentPage}:`, {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      break;
    }
  }

  console.log(`\n🎉 Done! Updated ${totalUpdated} out of ${totalChecked} posts checked.`);
}

// Start script
(async () => {
  try {
    const authCheck = await wpApi.get('/wp/v2/users/me');
    console.log(`👋 Logged in as: ${authCheck.data.name}`);
    await updatePostsInBatches();
  } catch (err) {
    console.error('❌ Authentication failed:', {
      message: err.message,
      data: err.response?.data
    });
  }
})();
