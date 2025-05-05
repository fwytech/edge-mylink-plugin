// 飞书API配置
const FEISHU_CONFIG = {
  appId: 'cli_a89ca17d403a100b',
  appSecret: 'yqYH8ZrLflzY5N35wj6KxgNpXQKdgjYb',
  baseId: 'QqOablSNoaQxFXs2I9qcRSXJn98',
  tableId: 'tblCACOL2rvOda6Z'
};

// 飞书API接口
const FEISHU_API = {
  GET_TENANT_ACCESS_TOKEN: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
  ADD_RECORD: 'https://open.feishu.cn/open-apis/bitable/v1/apps/{base_id}/tables/{table_id}/records'
};

// 状态消息显示函数
function showStatus(message, type = 'success') {
  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = message;
  statusElement.style.display = 'block';
  statusElement.className = `status ${type}`;
}

// 获取浏览器信息
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Edg/')) {
    return 'Edge';
  } else if (userAgent.includes('Chrome/')) {
    return 'Chrome';
  } else if (userAgent.includes('Firefox/')) {
    return 'Firefox';
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    return 'Safari';
  } else {
    return '未知浏览器';
  }
}

// 获取当前标签页URL和标题
async function getCurrentTabInfo() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return {
    url: tabs[0].url,
    title: tabs[0].title || ''
  };
}

// 获取飞书tenant_access_token
async function getTenantAccessToken() {
  try {
    console.log('开始获取tenant_access_token...');
    const response = await fetch(FEISHU_API.GET_TENANT_ACCESS_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': Date.now().toString()
      },
      body: JSON.stringify({
        'app_id': FEISHU_CONFIG.appId,
        'app_secret': FEISHU_CONFIG.appSecret
      })
    });

    if (!response.ok) {
      console.error('获取tenant_access_token HTTP错误:', response.status, response.statusText);
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('获取tenant_access_token响应:', data);

    if (data.code !== 0) {
      console.error('获取tenant_access_token业务错误:', data);
      throw new Error(data.msg || `获取access_token失败 (错误码: ${data.code})`);
    }

    console.log('成功获取tenant_access_token');
    return data.tenant_access_token;
  } catch (error) {
    console.error('获取tenant_access_token失败:', error);
    throw new Error(`获取授权失败: ${error.message}`);
  }
}

// 添加记录到多维表格
async function addRecord(url, title, accessToken) {
  try {
    console.log('开始添加记录...', { url, title });
    const apiUrl = FEISHU_API.ADD_RECORD
      .replace('{base_id}', FEISHU_CONFIG.baseId)
      .replace('{table_id}', FEISHU_CONFIG.tableId);

    console.log('请求URL:', apiUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Request-ID': Date.now().toString()
      },
      body: JSON.stringify({
        fields: {
          '链结': {
            'text': title,
            'link': url
          },
          '收藏来源': getBrowserInfo(),
          '阅读状态': (() => {
            const readStatusEl = document.querySelector('input[name="readStatus"]:checked');
            return readStatusEl ? (readStatusEl.value === 'read' ? '已阅读' : '仅记录') : '仅记录';
          })(),
          '文章用途': (() => {
            const purposeEl = document.querySelector('input[name="articlePurpose"]:checked');
            return purposeEl ? (purposeEl.value === 'development' ? '研发用' : '学习用') : '研发用';
          })(),
          '使用时间': (() => {
            const usageTimeEl = document.querySelector('input[name="usageTime"]:checked');
            if (!usageTimeEl) return '以后会用';
            switch(usageTimeEl.value) {
              case 'future': return '以后会用';
              case 'soon': return '最近就用';
              case 'favorite': return '好文收藏';
              default: return '以后会用';
            }
          })(),
          '文章分类': (() => {
            const categoryEl = document.getElementById('articleCategory');
            return categoryEl ? categoryEl.value : '综合应用';
          })()
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('添加记录HTTP错误:', response.status, response.statusText, '\n响应内容:', errorText);
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('添加记录响应:', data);

    if (data.code !== 0) {
      console.error('添加记录业务错误:', data);
      throw new Error(data.msg || `添加记录失败 (错误码: ${data.code})`);
    }

    console.log('成功添加记录');
    showStatus('链接保存成功！');
    return data;
  } catch (error) {
    console.error('添加记录失败:', error);
    showStatus(error.message, true);
    throw error;
  }
}

// 初始化事件监听
document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('saveButton');
  const radioButtons = document.querySelectorAll('input[name="readStatus"]');

  // 监听单选按钮的变化
  radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      console.log('阅读状态已更改:', e.target.value);
    });
  });
  
  saveButton.addEventListener('click', async () => {
    try {
      saveButton.disabled = true;
      showStatus('正在保存链接，请稍候...', 'loading');
      const { url, title } = await getCurrentTabInfo();
      const accessToken = await getTenantAccessToken();
      await addRecord(url, title, accessToken);
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      saveButton.disabled = false;
    }
  });
});