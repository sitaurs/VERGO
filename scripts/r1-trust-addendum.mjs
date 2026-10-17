// Deterministic schema additions for report trust and private re-review.
export function addTrustRoutes(spec) {
 const schemas=spec.components.schemas;
 const ref=name=>({$ref:`#/components/schemas/${name}`});
 const str={type:'string'},uuid={type:'string',format:'uuid'},date={type:'string',format:'date-time'},positive={type:'integer',minimum:1};
 const nullable=schema=>({anyOf:[schema,{type:'null'}]});
 const closed=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
 schemas.TrustPolicyInput=closed({operatorLabel:nullable({...str,minLength:1,maxLength:100}),contactUrl:nullable({...str,format:'uri',pattern:'^https://',maxLength:500}),reviewNotice:nullable({...str,maxLength:1000}),retentionNotice:nullable({...str,maxLength:1000})});
 schemas.TrustPolicy=closed({...schemas.TrustPolicyInput.properties,revision:positive,updatedAt:date});
 schemas.ReportAppealInput=closed({reason:{...str,minLength:20,maxLength:2000},mediaIds:{type:'array',items:uuid,maxItems:3,uniqueItems:true}},['reason']);
 schemas.ReportAppealDecisionInput=closed({action:{...str,enum:['accept_review','reject','request_evidence']},reason:{...str,minLength:5,maxLength:1000},reportRevision:positive});
 schemas.ReportAppeal=closed({id:uuid,reportId:uuid,sourceRevision:positive,reportRevision:positive,reportStatus:ref('ReportStatus'),reason:{...str,minLength:20,maxLength:2000},mediaIds:{type:'array',items:uuid,maxItems:3},status:{...str,enum:['pending','needs_evidence','accepted','rejected']},revision:positive,decisionReason:nullable(str),createdAt:date,updatedAt:date});
 schemas.ReportAppealPage=closed({items:{type:'array',items:ref('ReportAppeal')},nextCursor:nullable(str)});
 const source=schemas.InstagramPost.properties.source;
 Object.assign(source.properties,{canonicalId:uuid,publicUrl:{...str,format:'uri'}});
 source.required=[...new Set([...(source.required??[]),'canonicalId','publicUrl'])];
 const reportSource=schemas.InstagramReportSource;
 Object.assign(reportSource.properties,{canonicalId:uuid,publicUrl:{...str,format:'uri'}});
 reportSource.required=[...new Set([...reportSource.required,'canonicalId','publicUrl'])];
 schemas.InstagramPost.properties.sourceUpdate=closed({currentSourceRevision:positive,currentStatus:ref('ReportStatus'),changed:{type:'boolean'},followUpRequired:{type:'boolean'},reason:nullable({...str,enum:['SOURCE_REVISION_CHANGED','SOURCE_NOT_APPROVED']}),publicUrl:{...str,format:'uri'}});
 schemas.InstagramPost.required=[...new Set([...schemas.InstagramPost.required,'sourceUpdate'])];
 schemas.PublicIncident.properties.latestCorrection=nullable(closed({summary:str,createdAt:date}));
 schemas.PublicIncident.properties.handling=nullable(closed({progress:{...str,enum:['assigned','accepted','working','done']},updatedAt:date}));
 schemas.PublicIncident.required=[...new Set([...schemas.PublicIncident.required,'latestCorrection','handling'])];
 const param=(name,where,schema,required=true)=>({name,in:where,required,schema});
 const ids=[param('id','path',uuid)],im=param('if-match','header',{...str,pattern:'^[1-9][0-9]*$'}),ik=param('idempotency-key','header',uuid);
 const route=(path,method,id,access,result,body,parameters=[],status=200)=>{
  const wrapper=id+'Response';schemas[wrapper]=closed({data:ref(result),meta:ref('Meta')});
  spec.paths[path]??={};spec.paths[path][method]={operationId:id,tags:['r1-trust'],security:access==='public'?[]:[{sessionCookie:[],...(method==='get'?{}:{csrfHeader:[]})}],parameters,
   ...(body?{requestBody:{required:true,content:{'application/json':{schema:ref(body)}}}}:{}),responses:{[status]:{description:'Success',content:{'application/json':{schema:ref(wrapper)}}},...Object.fromEntries([400,401,403,404,409,422,429,503].map(code=>[code,{description:'Domain error',content:{'application/json':{schema:ref('ErrorEnvelope')}}}]))},'x-contract-stage':'draft','x-authorization-policy':access};
 };
 route('/public/trust-policy','get','getPublicTrustPolicy','public','TrustPolicy');
 route('/admin/trust-settings','get','getTrustSettings','admin','TrustPolicy');
 route('/admin/trust-settings','put','saveTrustSettings','admin','TrustPolicy','TrustPolicyInput',[im,ik]);
 route('/reports/{id}/appeals','get','listMyReportAppeals','owner','ReportAppealPage',null,ids);
 route('/reports/{id}/appeals','post','createReportAppeal','verified owner','ReportAppeal','ReportAppealInput',[...ids,im,ik],201);
 route('/report-appeals/{id}','patch','reviseReportAppeal','verified owner','ReportAppeal','ReportAppealInput',[...ids,im,ik]);
 schemas.PrivateEvidenceUrl=closed({url:{...str,format:'uri'},expiresAt:date});
 route('/report-appeals/{id}/media/{mediaId}/url','get','getPrivateAppealEvidenceUrl','appeal owner or admin','PrivateEvidenceUrl',null,[...ids,param('mediaId','path',uuid)]);
 route('/admin/report-appeals','get','listReportAppeals','admin','ReportAppealPage',null,[param('limit','query',{type:'integer',minimum:1,maximum:50},false),param('cursor','query',str,false),param('status','query',schemas.ReportAppeal.properties.status,false)]);
 route('/admin/report-appeals/{id}/decisions','post','decideReportAppeal','admin','ReportAppeal','ReportAppealDecisionInput',[...ids,im,ik]);
 spec.paths['/users/me/community-updates'].get.parameters.push(param('reportId','query',uuid,false));
}
