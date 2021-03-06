import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Alert,
  TouchableWithoutFeedback,
  TouchableNativeFeedback,
  Image,
  ToastAndroid,
  Picker
} from 'react-native';
import { Container, Header, Title, Content, Footer, FooterTab, Button, Text, Left, Right, Body, Icon, Thumbnail, Form, Item, Label, Input, Textarea } from 'native-base';
import { FontSize } from '../util/FontSize';
import { width } from '../util/AdapterUtil';
import axios from 'axios';
import { Actions } from 'react-native-router-flux';
import { getSign, imei } from '../global/Param';
import { api_theme_all, api_article, api_accessToken } from '../global/Api';
import RNFetchBlob from 'rn-fetch-blob';
import ImagePicker from 'react-native-image-crop-picker';
import { inject, observer } from 'mobx-react';
import { domain } from '../global/Global';

const dirs = RNFetchBlob.fs.dirs;

@inject(["globalStore"])
@observer
export default class Edit extends Component {
  constructor(props) {
    super(props);
    this.state = {
      choice: '', // 选择的主题
      theme: [], // 全部主题数据集
      themeList: [], // 选项组件
      content: '', // 发布动态的文本内容
      img: [], // 发布动态的图片
      guid_img: [], // 发布动态图片的guid
      allow_comment: true, // 是否允许评论,默认允许
      allow_watermark: true, // 是否添加水印,默认添加
      imgComponents: [] // 图片组件数组
    }
  }

  componentDidMount() {
    let imgComponents = [];
    for(let i = 0; i < this.props.item.article_img.length; i++) {
      imgComponents.push(
        <Thumbnail square key={this.props.item.article_id} source={{uri: `${domain}image/${this.props.item.article_img[i]}-80-100.png`}} style={{width: width*0.2, height: width*0.2, margin: 5, backgroundColor: '#EBEBEB'}} />
      )
    }
    this.setState({
      imgComponents: imgComponents
    });
    axios({ // 获取所有主题
      url: api_theme_all,
      method: 'GET',
      headers: {
        'sign': getSign(),
        'app-type': Platform.OS,
        'did': imei
      }
    }).then(res => {
      let list = [];
      res.data.data.map((item, index) => {
        list.push(<Picker.Item label={item.theme_name} value={item.theme_name} key={item.theme_name} />);
      });
      this.setState({
        themeList: [...list],
        theme: res.data.data
      });
    }).catch(err => console.log(err));
  }

  selectImg = () => {
    ImagePicker.openPicker({
      width: 500,
      height: 500,
      cropping: true,
      cropperCircleOverlay: false,
      showCropGuidelines: false,
      includeBase64: true
    }).then(image => {
      ToastAndroid.show('正在上传图片',ToastAndroid.SHORT);
      axios({
        url: api_accessToken,
        method: 'GET',
        headers: {
          'sign': getSign(),
          'app-type': Platform.OS,
          'did': imei,
          'access-user-token': this.props.globalStore.token
        }
      }).then(res => {
        let access_token = res.data.data.access_token;
        let nonce = res.data.data.nonce;
        let filename = image.path.split('react-native-image-crop-picker/')[1];
        let format = filename.split('.')[1];
        let upload_url = `${domain}upload/${access_token}-${nonce}.${format}`;
        RNFetchBlob.fetch('POST', upload_url, {
          Authorization: 'Bearer access-token...',
          otherHeader: 'foo',
          'Content-Type': 'multipart/form-data'
        }, [
          // {name: 'image', filename: filename, type: image.mime + format, data: image.data}
          {name: 'image', filename: filename, type: image.mime + format, data: image.data}
        ]).then((res) => {
          let img = this.state.img;
          let imgComponents = this.state.imgComponents;
          let guid_img = this.state.guid_img;
          img.push(`data:${image.mime};base64,${image.data}`);
          guid_img.push(JSON.parse(res.data).message);
          imgComponents.push(
            <Thumbnail square key={JSON.parse(res.data).message} source={{uri: `data:${image.mime};base64,${image.data}`}} style={{width: width*0.2, height: width*0.2, margin: 5, backgroundColor: '#EBEBEB'}} />
          )
          this.setState({
            img: img,
            imgComponents: imgComponents,
            guid_img: guid_img
          });
          ToastAndroid.show('上传图片成功!', ToastAndroid.SHORT);
        }).catch((err) => console.warn(err))
      }).catch(err => console.log(err));
    }).catch(err => console.log(err));
  }

  publish = () => {
    if(this.state.content == '' && this.state.guid_img == '') {
      ToastAndroid.show('发布内容不能同时为空!', ToastAndroid.SHORT);
    } else {
      let theme_id = '';
      if(this.state.choice == '') {
        theme_id = this.state.theme[0].theme_id;
      } else {
        for(let i = 1; i < this.state.theme.length; i++) {
          if(this.state.theme[i].theme_name == this.state.choice) {
            theme_id = this.state.theme[i].theme_id;
          }
          break;
        }
      }
      axios({
        url: api_article,
        method: 'POST',
        headers: {
          'sign': getSign(),
          'app-type': Platform.OS,
          'did': imei,
          'access-user-token': this.props.globalStore.token
        },
        data: {
          'theme_id': theme_id,
          'user_id': this.props.globalStore.userInfo.id,
          'content': this.state.content,
          'img': this.state.guid_img,
          'allow_comment': Number(this.state.allow_comment),
          'allow_watermark': Number(this.state.allow_watermark)
        }
      }).then(res => {
        if(res.data.status) {
          ToastAndroid.show('发布成功!', ToastAndroid.SHORT);
        }
      }).catch(err => console.log(err));
    }
  }

  render() {
    return (
      <Container>
        {Platform === 'android' && (<StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />)}
        <Header
          androidStatusBarColor="#53BFA2"
          style={styles.header}
        >
          <View style={styles.titleWrapper}>
            <TouchableWithoutFeedback onPress={() => {Actions.pop()}}>
              <Icon name="ios-arrow-back" style={styles.backIcon} />
            </TouchableWithoutFeedback>
            <Text style={styles.title}>发布新动态</Text>
          </View>
          <TouchableWithoutFeedback onPress={this.publish}>
            <Text style={styles.publishText}>发布</Text>
          </TouchableWithoutFeedback>
        </Header>
        <Content style={styles.content}>
          <View style={styles.editWrapper}>
            <Form>
              <Textarea rowSpan={7} placeholder="分享些什么吧..." style={styles.textarea} onChangeText={(text) => this.setState({content: text})} defaultValue={this.props.item ? this.props.item.article_content : ''}></Textarea>
            </Form>
            <TouchableWithoutFeedback onPress={this.selectImg}>
              <View style={styles.imgWrapper}>
                {this.state.imgComponents}
                <Thumbnail square source={require('../images/add.png')} style={styles.addImg} />
              </View>
            </TouchableWithoutFeedback>
          </View>
          <View style={styles.pickthemeWrapper}>
            <Text style={styles.pickthemeText}>选择主题</Text>
            <Picker
              mode={"dropdown"}
              selectedValue={this.state.choice}
              style={styles.picker}
              onValueChange={(itemValue, itemIndex) => this.setState({choice: itemValue})}>
              {this.state.themeList}
            </Picker>      
          </View>
          <View style={styles.optionWrapper}>
            <Text style={styles.optionText}>是否允许评论</Text>
            <TouchableWithoutFeedback onPress={() => {this.setState({allow_comment: !this.state.allow_comment})}}>
              <View style={styles.circle}>
                <View style={[styles.spot, {opacity: this.state.allow_comment ? 1 : 0}]}>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
          <View style={styles.optionWrapper}>
            <Text style={styles.optionText}>是否添加图片水印</Text>
            <TouchableWithoutFeedback onPress={() => {this.setState({allow_watermark: !this.state.allow_watermark})}}>
              <View style={styles.circle}>
                <View style={[styles.spot, {opacity: this.state.allow_watermark ? 1 : 0}]}>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </Content>
      </Container>
    );
  }
}
const styles = StyleSheet.create({
  header: {
    height: 50,
    flexDirection: 'row',
    justifyContent:'space-between',
    alignItems: 'center',
    backgroundColor: '#53BFA2'
  },
  titleWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backIcon: {
    fontSize: FontSize(30),
    color: '#fff',
    marginRight: 10
  },
  title: {
    fontSize: FontSize(16),
    color: '#fff',
    fontWeight: 'bold'
  },
  publishText: {
    fontSize: FontSize(16),
    color: '#fff'
  },
  content: {
    backgroundColor: '#EBEBEB'
  },
  editWrapper: {
    backgroundColor: '#fff'
  },
  textarea: {
    fontSize: FontSize(16)
  },
  imgWrapper: {
    flexDirection: 'row',
    padding: 10
  },
  addImg: {
    width: width*0.2,
    height: width*0.2,
    backgroundColor: '#EBEBEB'
  },
  pickthemeWrapper: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pickthemeText: {
    fontSize: FontSize(16),
    color: '#666666'
  },
  picker: {
    width: width*0.3,
    color: '#53BFA2'
  },
  optionWrapper: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  optionText: {
    fontSize: FontSize(16),
    color: '#666666'
  },
  circle: {
    padding: 2,
    borderColor: '#53BFA2',
    borderWidth: 2,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center'
  },
  spot: {
    width: 10,
    height: 10,
    backgroundColor: '#53BFA2',
    borderRadius: 10
  }
})