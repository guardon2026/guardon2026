"use strict";(()=>{var e={};e.id=3866,e.ids=[3866],e.modules={53524:e=>{e.exports=require("@prisma/client")},72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},84770:e=>{e.exports=require("crypto")},8678:e=>{e.exports=import("pg")},80012:(e,r,t)=>{t.a(e,async(e,a)=>{try{t.r(r),t.d(r,{originalPathname:()=>y,patchFetch:()=>c,requestAsyncStorage:()=>p,routeModule:()=>u,serverHooks:()=>w,staticGenerationAsyncStorage:()=>d});var s=t(49303),i=t(88716),n=t(60670),o=t(26971),l=e([o]);o=(l.then?(await l)():l)[0];let u=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/search/workers/route",pathname:"/api/search/workers",filename:"route",bundlePath:"app/api/search/workers/route"},resolvedPagePath:"C:\\guardon\\guardon-main\\src\\app\\api\\search\\workers\\route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:p,staticGenerationAsyncStorage:d,serverHooks:w}=u,y="/api/search/workers/route";function c(){return(0,n.patchFetch)({serverHooks:w,staticGenerationAsyncStorage:d})}a()}catch(e){a(e)}})},49303:(e,r,t)=>{e.exports=t(30517)},26971:(e,r,t)=>{t.a(e,async(e,a)=>{try{t.r(r),t.d(r,{GET:()=>c,dynamic:()=>u});var s=t(87070),i=t(61165),n=t(13538),o=t(53524),l=e([i,n]);[i,n]=l.then?(await l)():l;let u="force-dynamic";async function c(e){let r=await (0,i.Z1)();if(!r?.user||"COMPANY_OWNER"!==r.user.role)return s.NextResponse.json({error:"접근 권한이 없습니다. 업체 대표만 인력 검색이 가능합니다."},{status:401});let{searchParams:t}=e.nextUrl,a=t.get("lat"),l=t.get("lng"),c=t.get("radiusKm"),u=t.get("workField")??"",p=t.get("credentialType")??"",d=t.get("availability")??"AVAILABLE",w=t.get("minExperience")??"0";if(!a||!l)return s.NextResponse.json({error:"위도(lat)와 경도(lng)는 필수 파라미터입니다."},{status:400});let y=parseFloat(a),g=parseFloat(l),h=c?parseFloat(c):20,m=parseInt(w,10)||0;if(isNaN(y)||isNaN(g)||isNaN(h))return s.NextResponse.json({error:"위도, 경도, 반경 값이 올바르지 않습니다."},{status:400});if(!["AVAILABLE","UNAVAILABLE","BUSY"].includes(d))return s.NextResponse.json({error:"가용 상태 값이 올바르지 않습니다."},{status:400});try{let e=await n._.$queryRaw`
      SELECT
        wp.id,
        wp."userId",
        wp."workFields",
        wp."experienceYears",
        wp."desiredHourlyRate",
        wp."averageRating",
        wp.availability,
        wp.city,
        wp.district,
        u.name,
        CASE
          WHEN wp.location IS NOT NULL THEN
            ST_Distance(
              wp.location,
              ST_SetSRID(ST_MakePoint(${g}, ${y}), 4326)::geography
            )
          ELSE 999999
        END as distance_m
      FROM worker_profiles wp
      JOIN users u ON u.id = wp."userId" AND u."deletedAt" IS NULL
      WHERE (
        (
          wp.location IS NOT NULL
          AND ST_DWithin(
            wp.location,
            ST_SetSRID(ST_MakePoint(${g}, ${y}), 4326)::geography,
            ${1e3*h}
          )
        )
        OR wp.location IS NULL
      )
        AND wp.availability = ${d}::text::"AvailabilityStatus"
        AND wp."isProfilePublic" = true
        AND wp."experienceYears" >= ${m}
      ORDER BY distance_m ASC
      LIMIT 50
    `;if(u&&(e=e.filter(e=>e.workFields.includes(u))),0===e.length)return s.NextResponse.json({workers:[]});let r=e.map(e=>e.id),t=await n._.credential.findMany({where:{workerProfileId:{in:r},status:o.CredentialStatus.APPROVED},select:{workerProfileId:!0,type:!0,status:!0}}),a=e;if(p){let r=new Set(t.filter(e=>e.type===p).map(e=>e.workerProfileId));a=e.filter(e=>r.has(e.id))}let i={};for(let e of t)i[e.workerProfileId]||(i[e.workerProfileId]=[]),i[e.workerProfileId].push(e);let l=a.map(e=>{var r;return{id:e.id,userId:e.userId,name:e.name,workFields:(r=e.workFields,Array.isArray(r)?r:"string"==typeof r?r.replace(/^{|}$/g,"").split(",").filter(Boolean):[]),experienceYears:e.experienceYears,desiredHourlyRate:e.desiredHourlyRate,averageRating:e.averageRating,availability:e.availability,city:e.city,district:e.district,distanceM:Math.round(e.distance_m),credentials:i[e.id]??[]}});return s.NextResponse.json({workers:l})}catch(e){return console.error("[GET /api/search/workers] error:",e),s.NextResponse.json({error:"인력 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."},{status:500})}}a()}catch(e){a(e)}})},89355:(e,r,t)=>{t.d(r,{Z:()=>a});let a={providers:[],session:{strategy:"jwt"},callbacks:{session:async({session:e,token:r})=>(r&&(e.user.role=r.role,e.user.id=r.userId),e)},pages:{signIn:"/login",error:"/login"}}},95456:(e,r,t)=>{t.a(e,async(e,a)=>{try{t.d(r,{I8:()=>p,handlers:()=>u,zB:()=>d});var s=t(39207),i=t(7585),n=t(72117),o=t(13538),l=t(89355),c=e([o]);o=(c.then?(await c)():c)[0];let{handlers:u,auth:p,signIn:d,signOut:w}=(0,s.ZP)({...l.Z,debug:!0,providers:[(0,n.Z)({clientId:process.env.KAKAO_CLIENT_ID,clientSecret:process.env.KAKAO_CLIENT_SECRET??"",authorization:"https://kauth.kakao.com/oauth/authorize?scope=profile_nickname,profile_image,account_email,talk_message"})],adapter:(0,i.N)(o._),callbacks:{async jwt({token:e,user:r}){if(r){let t=await o._.user.findUnique({where:{id:r.id,deletedAt:null},select:{role:!0,id:!0}});e.role=t?.role,e.userId=t?.id}return e},session:async({session:e,token:r})=>(r&&(e.user.role=r.role,e.user.id=r.userId),e)},events:{async createUser({user:e}){e.name||await o._.user.update({where:{id:e.id},data:{name:"카카오 사용자"}})}}});a()}catch(e){a(e)}})},82996:(e,r,t)=>{t.d(r,{s:()=>a});async function a(){return null}},13538:(e,r,t)=>{t.a(e,async(e,a)=>{try{t.d(r,{_:()=>l});var s=t(53524),i=t(49683),n=t(8678),o=e([n,i]);[n,i]=o.then?(await o)():o;let l=globalThis.prisma??function(){let e=new n.Pool({connectionString:process.env.DATABASE_URL}),r=new i.g(e);return new s.PrismaClient({adapter:r,log:["error"]})}();a()}catch(e){a(e)}})},61165:(e,r,t)=>{t.a(e,async(e,a)=>{try{t.d(r,{MH:()=>u,Z1:()=>c});var s=t(95456),i=t(82996),n=t(13538),o=t(58585),l=e([s,n]);async function c(){return await (0,i.s)()||(0,s.I8)()}async function u(e){let r=await c();return r||(0,o.redirect)("/login"),r.user.role!==e&&(0,o.redirect)("/unauthorized"),r}[s,n]=l.then?(await l)():l,a()}catch(e){a(e)}})}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),a=r.X(0,[8948,9583,4054,9407],()=>t(80012));module.exports=a})();