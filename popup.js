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
          }
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