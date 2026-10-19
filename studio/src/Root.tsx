import React from "react";
import {Composition, Still} from "remotion";
import {V001, type V001Props} from "./V001";
import {FPS} from "./kit";
import defaults from "./v001-default-props.json";
import {Thumbnail, type ThumbProps} from "./Thumbnail";
import {LogoIG, LogoRound} from "./Logo";
import {Reel, type ReelProps} from "./Reel";
import reelDefaults from "./reel-default-props.json";

const thumb001: ThumbProps = {
  accent: 0, icon: "v001/icon.png", paid: "CleanMyMac", price: "$40/yr",
  big: "FREE", line1: "CleanMyMac", line2: "alternative", repo: "momenbasel/PureMac",
};

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="reel"
    component={Reel}
    defaultProps={reelDefaults as unknown as ReelProps}
    calculateMetadata={({props}) => ({durationInFrames: Math.round(props.b.end * FPS)})}
    fps={FPS}
    width={1080}
    height={1920}
  />
  <Still id="logo-round" component={LogoRound} defaultProps={{accent: 0}} width={1024} height={1024} />
  <Still id="logo-ig" component={LogoIG} defaultProps={{accent: 0}} width={1080} height={1080} />
  <Still id="thumb" component={Thumbnail} defaultProps={thumb001} width={1080} height={1920} />
  <Composition
    id="v001-puremac"
    component={V001}
    defaultProps={defaults as V001Props}
    calculateMetadata={({props}) => ({durationInFrames: Math.round(props.b.end * FPS)})}
    fps={FPS}
    width={1080}
    height={1920}
  />
  </>
);
